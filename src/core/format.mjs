import { escapeHtml, decodeEntities } from "../lib/text.mjs";
import { formatShortDate } from "../lib/time.mjs";

/** Telegram-flavoured HTML for a single job. */
export function formatJob(job, timeZone) {
  const details = [job.company, job.location, job.source, formatShortDate(job.publishedAt, timeZone)]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" · ");
  const flag = job.international ? "🌎" : "🇧🇷";
  return `${flag} <b>${escapeHtml(job.title)}</b>\n${details}\n${escapeHtml(job.url)}`;
}

export function formatDigestHeader(sent, pending) {
  const suffix = pending ? ` (+${pending} na próxima execução)` : "";
  return `🆕 <b>${sent} ${sent === 1 ? "vaga nova" : "vagas novas"}</b>${suffix}`;
}

/** Converts the Telegram HTML subset back to plain text for terminal output. */
export function htmlToPlainText(html) {
  return decodeEntities(
    html.replace(/<a href="([^"]+)">([^<]*)<\/a>/g, "$2\n  $1").replace(/<[^>]+>/g, ""),
  );
}
