/**
 * Shared JSDoc type definitions. This module has no runtime code.
 *
 * @typedef {object} Job
 * @property {string} id           Stable, source-prefixed identifier (e.g. "gupy:123").
 * @property {string} title
 * @property {string} company
 * @property {string} location
 * @property {string} region       Applicant region required by international boards ("" = none).
 * @property {string} url
 * @property {string} source       Human-readable source label.
 * @property {Date|null} publishedAt
 * @property {string} description  Plain text.
 * @property {string[]} tags
 * @property {boolean} international
 * @property {boolean} levelPrefiltered  True when the source already filters by seniority.
 *
 * @typedef {object} Source
 * @property {string} key           Matches a key in `config.sources`.
 * @property {boolean} international
 * @property {(options: any, ctx: SourceContext) => Promise<Job[] | { skipped: string }>} fetch
 *
 * @typedef {object} SourceContext
 * @property {RadarConfig} config
 * @property {NodeJS.ProcessEnv} env
 * @property {(message: string) => void} warn
 *
 * @typedef {object} RadarConfig
 * @property {string} timezone
 * @property {boolean} includeInternational
 * @property {number} maxAgeDays
 * @property {number} maxJobsPerRun
 * @property {string[]} levels
 * @property {string[]} excludedLevels
 * @property {boolean} includeWithoutLevel
 * @property {string[]} roles
 * @property {string[]} stack
 * @property {string[]} internationalMarkers
 * @property {string[]} acceptedInternationalLocations
 * @property {Record<string, { enabled: boolean } & Record<string, any>>} sources
 * @property {{ enabled: boolean, fromHour: number, queries: string[] }} recruiterPosts
 *
 * @typedef {object} State
 * @property {boolean|null} includeInternational  Runtime override set through the bot.
 * @property {Record<string, string>} seen         Job id -> ISO timestamp of notification.
 * @property {number} telegramOffset
 * @property {string} lastRecruiterDigest          Local date (YYYY-MM-DD) of the last digest.
 */

export {};
