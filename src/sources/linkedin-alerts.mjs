import { decodeEntities, stripHtml } from "../lib/text.mjs";
import { createJob } from "../core/job.mjs";

const ALERT_SENDER = "jobalerts-noreply@linkedin.com";
const JOB_LINK = /linkedin\.com\/(?:comm\/)?jobs\/view\/(\d+)/;

/**
 * Reads LinkedIn job-alert e-mails from Gmail over IMAP (read-only).
 * Seniority, location and remote filters are configured in the alert itself,
 * so jobs are marked as level-prefiltered.
 *
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD (a Google app password).
 *
 * @type {import("../core/types.mjs").Source}
 */
export default {
  key: "linkedinAlerts",
  international: false,

  async fetch({ mailbox }, { env, config }) {
    if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
      return { skipped: "GMAIL_USER/GMAIL_APP_PASSWORD não definidos" };
    }

    const [{ ImapFlow }, { simpleParser }] = await Promise.all([import("imapflow"), import("mailparser")]);
    const client = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
      logger: false,
    });

    const jobs = [];
    await client.connect();
    try {
      const lock = await client.getMailboxLock(mailbox, { readOnly: true });
      try {
        const since = new Date(Date.now() - config.maxAgeDays * 86_400_000);
        for await (const message of client.fetch({ from: ALERT_SENDER, since }, { source: true })) {
          const mail = await simpleParser(message.source);
          jobs.push(...parseAlertEmail(mail.html || "", mail.text || "", mail.date ?? null));
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
    return jobs;
  },
};

/**
 * Extracts jobs from a LinkedIn alert e-mail. Uses anchor text from the HTML
 * body; falls back to the lines preceding each link in the plain-text body.
 */
export function parseAlertEmail(html, text, receivedAt) {
  const titles = new Map();

  for (const [, href, inner] of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const id = decodeEntities(href).match(JOB_LINK)?.[1];
    const title = stripHtml(inner);
    if (id && title && !titles.has(id)) titles.set(id, title);
  }

  if (!titles.size) {
    const lines = text.split(/\r?\n/).map((line) => line.trim());
    lines.forEach((line, i) => {
      const id = line.match(JOB_LINK)?.[1];
      if (!id || titles.has(id)) return;
      const context = [];
      for (let k = i - 1; k >= 0 && context.length < 3; k--) {
        if (!lines[k]) continue;
        if (/https?:|^-{3,}/.test(lines[k])) break;
        context.unshift(lines[k]);
      }
      titles.set(id, context.join(" · ") || "Vaga no LinkedIn");
    });
  }

  return [...titles].map(([id, title]) => createJob({
    id: `linkedin:${id}`,
    title,
    url: `https://www.linkedin.com/jobs/view/${id}/`,
    source: "LinkedIn",
    publishedAt: receivedAt,
    levelPrefiltered: true,
  }));
}
