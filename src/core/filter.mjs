import { createMatcher } from "../lib/text.mjs";

export const REJECTION = Object.freeze({
  INTERNATIONAL: "internacional",
  LOCATION: "região não aceita o Brasil",
  TOO_OLD: "antiga",
  NOT_TECH: "fora da área de tecnologia",
  SENIORITY: "senioridade acima de júnior",
  NO_LEVEL: "sem senioridade no título",
  STACK: "fora da stack",
});

/**
 * Builds the job filter. The returned function yields `null` when a job is
 * accepted, or a REJECTION reason otherwise.
 *
 * The title is the primary signal; tags only break ties, because some boards
 * attach dozens of generic tags to every listing.
 *
 * @param {import("./types.mjs").RadarConfig} config
 * @param {{ includeInternational: boolean, now?: number }} options
 */
export function createJobFilter(config, { includeInternational, now = Date.now() }) {
  const hasLevel = createMatcher(config.levels);
  const hasExcludedLevel = createMatcher(config.excludedLevels);
  const hasRole = createMatcher(config.roles);
  const hasStack = createMatcher(config.stack);
  const isMarkedInternational = createMatcher(config.internationalMarkers);
  const isAcceptedLocation = createMatcher(config.acceptedInternationalLocations);
  const oldestAllowed = now - config.maxAgeDays * 86_400_000;

  /** @param {import("./types.mjs").Job} job */
  return (job) => {
    const { title } = job;
    const tags = job.tags.join(" ");
    // Local boards also list roles paid in USD or requiring fluent English.
    job.international ||= isMarkedInternational(`${title} ${tags}`);

    if (job.international && !includeInternational) return REJECTION.INTERNATIONAL;
    if (job.region && !isAcceptedLocation(job.region)) return REJECTION.LOCATION;
    if (job.publishedAt && job.publishedAt.getTime() < oldestAllowed) return REJECTION.TOO_OLD;
    if (!hasRole(title)) return REJECTION.NOT_TECH;

    if (!job.levelPrefiltered && !hasLevel(title)) {
      if (hasExcludedLevel(title)) return REJECTION.SENIORITY;
      if (!hasLevel(tags)) {
        if (hasExcludedLevel(tags)) return REJECTION.SENIORITY;
        if (!config.includeWithoutLevel) return REJECTION.NO_LEVEL;
      }
    }

    if (config.stack.length && !hasStack(`${title} ${tags} ${job.description}`)) return REJECTION.STACK;
    return null;
  };
}
