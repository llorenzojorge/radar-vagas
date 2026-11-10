import { escapeHtml } from "../lib/text.mjs";
import { nowInZone } from "../lib/time.mjs";

/**
 * LinkedIn offers no public API for post search, and automating a logged-in
 * session violates its terms. Instead, a daily message links to pre-built
 * searches of the last 24 hours.
 *
 * @returns {string|null} Telegram HTML, or null when the digest is not due.
 */
export function buildRecruiterDigest(config, state, now = new Date()) {
  const settings = config.recruiterPosts;
  if (!settings?.enabled || !settings.queries.length) return null;

  const { date, hour } = nowInZone(config.timezone, now);
  if (state.lastRecruiterDigest === date || hour < settings.fromHour) return null;

  const links = settings.queries.map((query) => {
    const url = `https://www.linkedin.com/search/results/content/?${new URLSearchParams({
      keywords: query,
      datePosted: '"past-24h"',
      sortBy: '"date_posted"',
    })}`;
    return `• <a href="${escapeHtml(url)}">${escapeHtml(query)}</a>`;
  });

  state.lastRecruiterDigest = date;
  return `📣 <b>Publicações de recrutadores (últimas 24h)</b>\n\n${links.join("\n")}`;
}
