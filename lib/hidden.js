/**
 * Hidden articles: notes that exist in the repository but must not appear on
 * the public site.
 *
 * Edit this list and push. Nothing else is needed — hiding happens once, in the
 * data layer, so the home page, category pages, sitemap, internal links,
 * related-article lists and structured data all stay consistent automatically.
 * A hidden article's own URL returns 404 rather than rendering.
 *
 * Write the path exactly as it lives in the repository, including the directory
 * and the file extension, e.g. '预推免相关/个人陈述.md'. A bare file name also
 * works and hides that file wherever it is, which is convenient but blunt — use
 * the full path when only one of several same-named notes should disappear.
 *
 * Hidden is not deleted: removing the entry restores the note on the next build.
 */
export const HIDDEN_PATHS = [
  // '预推免相关/个人陈述.md',
];

/**
 * @param {string} path repository-relative path, e.g. 'RDMA/毕设/开题.md'
 * @returns {boolean}
 */
export function isHidden(path) {
  if (!path || HIDDEN_PATHS.length === 0) return false;
  const full = String(path).replace(/^\/+/, '');
  const base = full.slice(full.lastIndexOf('/') + 1);
  return HIDDEN_PATHS.some((entry) => {
    const target = String(entry).replace(/^\/+/, '');
    return target === full || target === base;
  });
}


