import { fetchText } from "../lib/http.mjs";
import { stripHtml } from "../lib/text.mjs";
import { mapSettled } from "../lib/concurrency.mjs";
import { createJob, parseDate } from "../core/job.mjs";

const SEARCH_URL = "https://portal.gupy.io/job-search/";
const NEXT_DATA = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;

/**
 * Gupy's public job portal. The search page is server-rendered with the
 * first page of results embedded in `__NEXT_DATA__`, newest first.
 *
 * @type {import("../core/types.mjs").Source}
 */
export default {
  key: "gupy",
  international: false,

  async fetch({ terms }, { warn }) {
    const results = await mapSettled(terms, 4, async (term) => {
      const url = `${SEARCH_URL}term=${encodeURIComponent(term)}&workplaceTypes[]=remote`;
      const match = (await fetchText(url)).match(NEXT_DATA);
      if (!match) throw new Error("formato da página de busca mudou (__NEXT_DATA__ ausente)");
      return JSON.parse(match[1]).props?.pageProps?.initialJobList?.data ?? [];
    });

    const jobs = [];
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        warn(`gupy "${terms[i]}": ${result.reason.message}`);
        return;
      }
      for (const item of result.value) jobs.push(toJob(item));
    });
    if (!jobs.length && results.every((r) => r.status === "rejected")) {
      throw new Error("todas as buscas falharam");
    }
    return jobs;
  },
};

function toJob(item) {
  return createJob({
    id: `gupy:${item.id}`,
    title: item.name,
    company: item.careerPageName ?? "",
    location: "Remoto",
    url: item.jobUrl,
    source: "Gupy",
    publishedAt: parseDate(item.publishedDate),
    description: stripHtml(item.description ?? ""),
    tags: item.type === "vacancy_type_talent_pool" ? ["banco de talentos"] : [],
  });
}
