/**
 * Repo paths that must not be published as articles.
 *
 * Two distinct reasons live here; keep them separate so it stays obvious which
 * list a new entry belongs to.
 */

/**
 * The host refuses to serve these bytes. `播客转文字/E88.…_原文.md` answers
 * HTTP 451 ("The content may contain violation information") for every
 * request, browser included — the tree API lists it anyway.
 *
 * Listing a URL we can never serve is worse for crawling than omitting it, so
 * these disappear from the homepage, category pages and sitemap.
 * Delete an entry once the file is reachable again.
 */
export const HOST_BLOCKED_PATHS = new Set([
  '播客转文字/E88.金融离职潮元年：一位首席先下海试了试水温_原文.md',
]);

/**
 * Repository metadata rather than a note. The root README contains a single
 * heading and no body, which would publish a title-only page — thin content
 * that competes with the real articles.
 */
export const NON_CONTENT_PATHS = new Set(['README.md']);

export function isExcluded(relPath) {
  return HOST_BLOCKED_PATHS.has(relPath) || NON_CONTENT_PATHS.has(relPath);
}

export function isHostBlocked(relPath) {
  return HOST_BLOCKED_PATHS.has(relPath);
}

export function isNonContent(relPath) {
  return NON_CONTENT_PATHS.has(relPath);
}
