import gupy from "./gupy.mjs";
import github from "./github.mjs";
import linkedinAlerts from "./linkedin-alerts.mjs";
import { remotive, remoteok, weworkremotely } from "./international.mjs";

/** All available sources. Enable or disable them in `radar.config.mjs`. */
export const SOURCES = [gupy, github, linkedinAlerts, remotive, remoteok, weworkremotely];

/**
 * Runs every enabled source in parallel. A failing source never aborts the run.
 *
 * @param {import("../core/types.mjs").RadarConfig} config
 * @param {{ includeInternational: boolean, env: NodeJS.ProcessEnv, log: Console }} options
 * @returns {Promise<import("../core/types.mjs").Job[]>}
 */
export async function collectJobs(config, { includeInternational, env, log }) {
  const active = SOURCES.filter(
    (source) => config.sources[source.key]?.enabled && (includeInternational || !source.international),
  );
  const context = { config, env, warn: (message) => log.warn(`⚠️  ${message}`) };

  const results = await Promise.allSettled(
    active.map((source) => source.fetch(config.sources[source.key], context)),
  );

  const jobs = [];
  results.forEach((result, i) => {
    const { key } = active[i];
    if (result.status === "rejected") {
      log.warn(`⚠️  ${key}: falhou (${result.reason?.message ?? result.reason})`);
    } else if (!Array.isArray(result.value)) {
      log.info(`⏭️  ${key}: ignorada (${result.value.skipped})`);
    } else {
      log.info(`📥 ${key}: ${result.value.length} vagas`);
      jobs.push(...result.value);
    }
  });
  return jobs;
}
