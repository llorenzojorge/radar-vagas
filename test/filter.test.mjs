import { test } from "node:test";
import assert from "node:assert/strict";
import config from "../radar.config.mjs";
import { createJob } from "../src/core/job.mjs";
import { createJobFilter, REJECTION } from "../src/core/filter.mjs";

const NOW = Date.parse("2026-11-10T12:00:00Z");
const job = (fields) =>
  createJob({ id: "t:1", url: "https://example.com", source: "teste", publishedAt: new Date(NOW), ...fields });
const domestic = createJobFilter(config, { includeInternational: false, now: NOW });
const everything = createJobFilter(config, { includeInternational: true, now: NOW });

test("aceita vagas júnior e de estágio em tecnologia", () => {
  for (const title of [
    "Desenvolvedor Full Stack - Junior",
    "Pessoa Desenvolvedora Back-end Jr",
    "Estágio em Desenvolvimento de Software",
    "Analista de Sistemas (Desenvolvedor Java) Júnior",
  ]) {
    assert.equal(domestic(job({ title })), null, title);
  }
});

test("rejeita senioridades acima de júnior", () => {
  for (const title of ["Desenvolvedor Backend Sênior", "Dev Full Stack Pleno", "Fullstack Java/React Pl (Remoto)"]) {
    assert.equal(domestic(job({ title })), REJECTION.SENIORITY, title);
  }
});

test("aceita títulos com júnior e pleno ao mesmo tempo", () => {
  assert.equal(domestic(job({ title: "Developer ASP.NET/C# Junior/Pleno" })), null);
});

test("rejeita vagas fora da área de tecnologia", () => {
  assert.equal(domestic(job({ title: "Advogado Júnior" })), REJECTION.NOT_TECH);
});

test("rejeita vagas antigas", () => {
  const publishedAt = new Date(NOW - (config.maxAgeDays + 1) * 86_400_000);
  assert.equal(domestic(job({ title: "Desenvolvedor Júnior", publishedAt })), REJECTION.TOO_OLD);
});

test("etiquetas genéricas não promovem vagas sênior", () => {
  const listing = job({ title: "Senior Property Manager", tags: ["dev", "junior"], international: true });
  assert.notEqual(everything(listing), null);
});

test("toggle de internacionais oculta vagas de fontes estrangeiras", () => {
  const listing = job({ title: "Junior Developer", international: true });
  assert.equal(domestic(listing), REJECTION.INTERNATIONAL);
  assert.equal(everything(job({ title: "Junior Developer", international: true })), null);
});

test("toggle de internacionais oculta vagas em dólar de fontes nacionais", () => {
  assert.equal(domestic(job({ title: "[Remoto] Desenvolvedor Júnior (USD)" })), REJECTION.INTERNATIONAL);
});

test("rejeita regiões que não aceitam candidatos do Brasil", () => {
  const listing = job({ title: "Junior Developer", international: true, region: "USA only" });
  assert.equal(everything(listing), REJECTION.LOCATION);
  assert.equal(everything(job({ title: "Junior Developer", international: true, region: "LATAM" })), null);
});

test("alertas do LinkedIn dispensam a checagem de senioridade", () => {
  assert.equal(domestic(job({ title: "Desenvolvedor React", levelPrefiltered: true })), null);
});
