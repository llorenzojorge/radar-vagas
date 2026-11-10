import { fetchJson } from "../lib/http.mjs";
import { createMatcher } from "../lib/text.mjs";
import { mapSettled } from "../lib/concurrency.mjs";
import { createJob, parseDate } from "../core/job.mjs";

const isRemote = createMatcher(["remot*", "home office", "anywhere"]);

/**
 * Community job boards hosted as GitHub issues (e.g. backend-br/vagas).
 * Authenticated requests (GITHUB_TOKEN) raise the rate limit from 60 to 1,000+/h.
 *
 * @type {import("../core/types.mjs").Source}
 */
export default {
  key: "github",
  international: false,

  async fetch({ repos }, { env, warn }) {
    const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;

    const results = await mapSettled(repos, 4, (repo) =>
      fetchJson(
        `https://api.github.com/repos/${repo}/issues?state=open&sort=created&direction=desc&per_page=50`,
        headers,
      ),
    );

    const jobs = [];
    results.forEach((result, i) => {
      const repo = repos[i];
      if (result.status === "rejected") {
        const hint = result.reason.status === 403 && !env.GITHUB_TOKEN ? " (limite de requisições; defina GITHUB_TOKEN)" : "";
        warn(`github ${repo}: ${result.reason.message}${hint}`);
        return;
      }
      for (const issue of result.value) {
        if (issue.pull_request) continue;
        const tags = issue.labels.map((label) => (typeof label === "string" ? label : label.name));
        if (!isRemote(`${issue.title} ${tags.join(" ")}`)) continue;
        jobs.push(createJob({
          id: `gh:${repo}#${issue.number}`,
          title: issue.title,
          location: "Remoto",
          url: issue.html_url,
          source: repo,
          publishedAt: parseDate(issue.created_at),
          description: issue.body ?? "",
          tags,
        }));
      }
    });
    return jobs;
  },
};
