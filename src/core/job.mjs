/**
 * Creates a Job with safe defaults for every optional field.
 * @param {Partial<import("./types.mjs").Job> & Pick<import("./types.mjs").Job, "id" | "title" | "url" | "source">} fields
 * @returns {import("./types.mjs").Job}
 */
export function createJob(fields) {
  return {
    company: "",
    location: "",
    region: "",
    description: "",
    tags: [],
    publishedAt: null,
    international: false,
    levelPrefiltered: false,
    ...fields,
    title: (fields.title ?? "").replace(/\s+/g, " ").trim(),
  };
}

/** Parses a date, returning null instead of an invalid Date. */
export function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
