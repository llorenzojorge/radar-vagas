import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import config from "../radar.config.mjs";
import { createMatcher, normalize, escapeHtml, decodeEntities } from "../src/lib/text.mjs";
import { createJob } from "../src/core/job.mjs";
import { dedupeJobs, sortByNewest } from "../src/core/dedupe.mjs";
import { formatJob } from "../src/core/format.mjs";
import { buildRecruiterDigest } from "../src/core/recruiter-digest.mjs";
import { applyCommands } from "../src/bot/commands.mjs";
import { parseAlertEmail } from "../src/sources/linkedin-alerts.mjs";
import { emptyState, loadState, saveState } from "../src/storage/state.mjs";
import { mapSettled } from "../src/lib/concurrency.mjs";

test("normalize remove acentos e pontuação, preservando .net e c#", () => {
  assert.equal(normalize("Estágio — Desenvolvedor .NET/C#."), "estagio desenvolvedor .net c#");
});

test("createMatcher casa palavras inteiras e prefixos", () => {
  const match = createMatcher(["jr", "desenvolv*"]);
  assert.ok(match("Dev Jr"));
  assert.ok(match("Pessoa Desenvolvedora"));
  assert.ok(!match("Jrnalista"));
});

test("escapeHtml e decodeEntities", () => {
  assert.equal(escapeHtml('<b a="1">&'), "&lt;b a=&quot;1&quot;&gt;&amp;");
  assert.equal(decodeEntities("&lt;&#65;&#x42;&amp;&nbsp;"), "<AB& ");
});

test("dedupeJobs remove por id e por URL sem query string", () => {
  const jobs = [
    createJob({ id: "a", title: "x", url: "https://e.com/1?utm=1", source: "s" }),
    createJob({ id: "a", title: "x", url: "https://e.com/2", source: "s" }),
    createJob({ id: "b", title: "x", url: "https://e.com/1", source: "s" }),
    createJob({ id: "c", title: "x", url: "https://e.com/3", source: "s" }),
  ];
  assert.deepEqual(dedupeJobs(jobs).map((j) => j.id), ["a", "c"]);
});

test("sortByNewest ordena da mais recente e deixa sem data por último", () => {
  const jobs = [null, "2026-11-01", "2026-11-09"].map((d, i) =>
    createJob({ id: String(i), title: "x", url: `u${i}`, source: "s", publishedAt: d && new Date(d) }));
  assert.deepEqual(sortByNewest(jobs).map((j) => j.id), ["2", "1", "0"]);
});

test("formatJob escapa HTML do título", () => {
  const html = formatJob(createJob({ id: "1", title: "Dev <Jr> & cia", url: "https://e.com", source: "s" }), "UTC");
  assert.match(html, /<b>Dev &lt;Jr&gt; &amp; cia<\/b>/);
});

test("comandos do bot alternam e definem o toggle", () => {
  const state = emptyState();
  applyCommands(["/internacionais"], state, config);
  assert.equal(state.includeInternational, !config.includeInternational);
  applyCommands(["/internacionais off"], state, config);
  assert.equal(state.includeInternational, false);
  applyCommands(["/internacionais@MeuBot on"], state, config);
  assert.equal(state.includeInternational, true);
  assert.equal(applyCommands(["/status"], state, config).length, 1);
  assert.equal(applyCommands(["/desconhecido"], state, config).length, 0);
});

test("resumo de recrutadores sai uma vez por dia, após o horário configurado", () => {
  const state = emptyState();
  const before = new Date("2026-11-10T10:00:00Z"); // 07h em São Paulo
  const after = new Date("2026-11-10T13:00:00Z");  // 10h em São Paulo
  assert.equal(buildRecruiterDigest(config, state, before), null);
  assert.match(buildRecruiterDigest(config, state, after), /linkedin\.com\/search\/results\/content/);
  assert.equal(buildRecruiterDigest(config, state, after), null);
});

test("parseAlertEmail extrai vagas do HTML", () => {
  const html =
    '<a href="https://www.linkedin.com/comm/jobs/view/111/?trk=a&amp;x=1"><img></a>' +
    '<a href="https://www.linkedin.com/comm/jobs/view/111/">Desenvolvedor Júnior</a>' +
    '<a href="https://www.linkedin.com/comm/jobs/view/222/">Estágio em TI</a>';
  const jobs = parseAlertEmail(html, "", null);
  assert.deepEqual(jobs.map((j) => [j.id, j.title]), [["linkedin:111", "Desenvolvedor Júnior"], ["linkedin:222", "Estágio em TI"]]);
  assert.ok(jobs.every((j) => j.levelPrefiltered));
});

test("parseAlertEmail usa o texto puro quando não há HTML", () => {
  const text = "Desenvolvedor Jr\nEmpresa X\nBrasil (Remoto)\nVer vaga: https://www.linkedin.com/comm/jobs/view/333/";
  assert.equal(parseAlertEmail("", text, null)[0].title, "Desenvolvedor Jr · Empresa X · Brasil (Remoto)");
});

test("estado é salvo, recarregado e podado após 45 dias", async () => {
  const dir = await mkdtemp(join(tmpdir(), "radar-"));
  try {
    const path = join(dir, "nested", "state.json");
    const now = Date.parse("2026-11-10T00:00:00Z");
    const state = emptyState();
    state.seen = { old: "2026-09-01T00:00:00Z", recent: "2026-11-09T00:00:00Z" };
    await saveState(path, state, now);
    assert.deepEqual(Object.keys((await loadState(path)).seen), ["recent"]);
    assert.deepEqual(await loadState(join(dir, "missing.json")), emptyState());
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("mapSettled respeita o limite de concorrência e a ordem", async () => {
  let running = 0;
  let peak = 0;
  const results = await mapSettled([1, 2, 3, 4, 5], 2, async (n) => {
    running++;
    peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, 5));
    running--;
    if (n === 3) throw new Error("falha");
    return n * 10;
  });
  assert.equal(peak, 2);
  assert.deepEqual(results.map((r) => r.status === "fulfilled" ? r.value : "x"), [10, 20, "x", 40, 50]);
});
