import { fetchJson, fetchText } from "../lib/http.mjs";
import { decodeEntities, stripHtml } from "../lib/text.mjs";
import { mapSettled } from "../lib/concurrency.mjs";
import { createJob, parseDate } from "../core/job.mjs";

/**
 * International remote-job boards. They only run when international jobs are
 * enabled. All three require attribution, which is kept by linking to the
 * original listing.
 */

/** @type {import("../core/types.mjs").Source} */
export const remotive = {
  key: "remotive",
  international: true,
  async fetch() {
    // Note: Remotive's public API is delayed by 24 hours.
    const data = await fetchJson("https://remotive.com/api/remote-jobs?category=software-dev&limit=150");
    return data.jobs.map((job) => createJob({
      id: `remotive:${job.id}`,
      title: job.title,
      company: job.company_name,
      location: job.candidate_required_location,
      region: job.candidate_required_location ?? "",
      url: job.url,
      source: "Remotive",
      publishedAt: parseDate(job.publication_date),
      description: stripHtml(job.description),
      tags: job.tags ?? [],
      international: true,
    }));
  },
};

/** @type {import("../core/types.mjs").Source} */
export const remoteok = {
  key: "remoteok",
  international: true,
  async fetch() {
    const data = await fetchJson("https://remoteok.com/api");
    return data.filter((job) => job.id).map((job) => createJob({
      id: `remoteok:${job.id}`,
      title: job.position,
      company: job.company,
      location: job.location,
      region: job.location ?? "",
      url: job.url,
      source: "Remote OK",
      publishedAt: parseDate(job.date),
      description: stripHtml(job.description),
      tags: job.tags ?? [],
      international: true,
    }));
  },
};

const WWR_CATEGORIES = ["back-end", "front-end", "full-stack"];

/** @type {import("../core/types.mjs").Source} */
export const weworkremotely = {
  key: "weworkremotely",
  international: true,
  async fetch(_options, { warn }) {
    const results = await mapSettled(WWR_CATEGORIES, 3, (category) =>
      fetchText(`https://weworkremotely.com/categories/remote-${category}-programming-jobs.rss`),
    );
    const jobs = [];
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        warn(`weworkremotely ${WWR_CATEGORIES[i]}: ${result.reason.message}`);
        return;
      }
      for (const [, item] of result.value.matchAll(/<item>([\s\S]*?)<\/item>/g)) jobs.push(parseRssItem(item));
    });
    return jobs;
  },
};

function parseRssItem(item) {
  const field = (name) =>
    decodeEntities(item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim() ?? "");
  // Titles follow the "Company: Role" convention.
  const [company, ...rest] = field("title").split(": ");
  return createJob({
    id: `wwr:${field("guid") || field("link")}`,
    title: rest.length ? rest.join(": ") : company,
    company: rest.length ? company : "",
    location: field("region"),
    region: field("region"),
    url: field("link"),
    source: "We Work Remotely",
    publishedAt: parseDate(field("pubDate")),
    description: stripHtml(field("description")),
    international: true,
  });
}
