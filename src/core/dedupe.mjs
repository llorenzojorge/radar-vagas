/** Removes duplicates by id or by URL (ignoring query strings). Keeps the first occurrence. */
export function dedupeJobs(jobs) {
  const seen = new Set();
  return jobs.filter((job) => {
    const keys = [job.id, job.url.split("?")[0]].filter(Boolean);
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
}

/** Newest first; jobs without a date go last. */
export function sortByNewest(jobs) {
  return [...jobs].sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
}
