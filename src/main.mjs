#!/usr/bin/env node
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import config from "../radar.config.mjs";
import { collectJobs } from "./sources/index.mjs";
import { createJobFilter } from "./core/filter.mjs";
import { dedupeJobs, sortByNewest } from "./core/dedupe.mjs";
import { formatJob, formatDigestHeader, htmlToPlainText } from "./core/format.mjs";
import { buildRecruiterDigest } from "./core/recruiter-digest.mjs";
import { applyCommands, internationalEnabled, describeToggle } from "./bot/commands.mjs";
import { createTelegramClient } from "./notifiers/telegram.mjs";
import { loadState, saveState } from "./storage/state.mjs";

const USAGE = `Uso: radar-vagas [opções]

  --international      inclui vagas internacionais nesta execução
  --no-international   oculta vagas internacionais nesta execução
  --dry-run            exibe o resultado no terminal; não notifica nem salva estado
  --verbose            lista cada vaga descartada e o motivo
  -h, --help           exibe esta ajuda

Variáveis de ambiente: TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, GMAIL_USER,
GMAIL_APP_PASSWORD, GITHUB_TOKEN, RADAR_STATE_PATH (padrão: .state/state.json).`;

async function main() {
  const { values: flags } = parseArgs({
    options: {
      international: { type: "boolean" },
      "no-international": { type: "boolean" },
      "dry-run": { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (flags.help) return console.log(USAGE);

  const env = process.env;
  const dryRun = flags["dry-run"];
  const statePath = resolve(env.RADAR_STATE_PATH ?? ".state/state.json");
  const telegram = env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT_ID && !dryRun
    ? createTelegramClient({ token: env.TELEGRAM_TOKEN, chatId: env.TELEGRAM_CHAT_ID })
    : null;
  const notify = telegram ? telegram.send : async (html) => console.log(`\n${htmlToPlainText(html)}`);

  const state = await loadState(statePath);

  // 1. Bot commands (they may change the international toggle).
  if (telegram) {
    try {
      const { commands, nextOffset } = await telegram.readCommands(state.telegramOffset);
      state.telegramOffset = nextOffset;
      for (const reply of applyCommands(commands, state, config)) await telegram.send(reply);
    } catch (error) {
      console.warn(`⚠️  Comandos do bot: ${error.message}`);
    }
  }

  const flagOverride = flags.international ? true : flags["no-international"] ? false : null;
  const includeInternational = flagOverride ?? internationalEnabled(state, config);
  console.info(`🌎 Vagas internacionais: ${describeToggle(includeInternational)}${flagOverride === null ? "" : " (flag)"}`);

  // 2. Collect → dedupe → filter → keep unseen.
  const collected = dedupeJobs(await collectJobs(config, { includeInternational, env, log: console }));
  const filter = createJobFilter(config, { includeInternational });
  const rejected = {};
  const accepted = collected.filter((job) => {
    const reason = filter(job);
    if (reason) {
      rejected[reason] = (rejected[reason] ?? 0) + 1;
      if (flags.verbose) console.info(`   ✗ [${reason}] ${job.title} (${job.source})`);
    }
    return !reason;
  });
  const fresh = sortByNewest(accepted.filter((job) => !state.seen[job.id]));
  const batch = fresh.slice(0, config.maxJobsPerRun);

  console.info(`🔎 ${collected.length} coletadas, ${accepted.length} aprovadas, ${fresh.length} novas.`);
  console.info(`   Descartes: ${JSON.stringify(rejected)}`);

  // 3. Notify.
  if (batch.length) {
    const header = formatDigestHeader(batch.length, fresh.length - batch.length);
    const blocks = batch.map((job) => formatJob(job, config.timezone));
    if (telegram) await telegram.sendBlocks(header, blocks);
    else await notify([header, ...blocks].join("\n\n"));
  }

  const digest = buildRecruiterDigest(config, state);
  if (digest) await notify(digest);

  // 4. Persist (only after notifications succeeded, so nothing is lost).
  if (dryRun) return console.info("\n(dry-run: nenhuma notificação enviada, estado não salvo)");
  const notifiedAt = new Date().toISOString();
  for (const job of batch) state.seen[job.id] = notifiedAt;
  await saveState(statePath, state);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
