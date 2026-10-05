/**
 * Display helpers for fields a job actually stores.
 *
 * The Post Job form saves the place as `city`, `county`, `state` and `country`, and the date as
 * `dayDate`, `monthDate` and `yearDate`. There is no single `location` or `dateFrom` field (only old
 * imported jobs may have `location`), so read these helpers rather than `job.location` or `job.dateFrom`.
 */

/** "London, Greater London, United Kingdom", or the old `location` text, or "" when there is none. */
export const getJobLocation = (job) => {
  if (!job) return "";
  const parts = [job.city, job.county, job.state, job.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : job.location || "";
};

/** "12 March 2026", or "" when the job has no date. */
export const getJobDate = (job) => {
  if (!job) return "";
  return job.dayDate && job.monthDate && job.yearDate
    ? `${job.dayDate} ${job.monthDate} ${job.yearDate}`
    : "";
};
