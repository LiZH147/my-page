/**
 * Single source of truth for URL construction and display titles.
 *
 * Every page, link and sitemap entry MUST go through these helpers so the
 * URLs Google is given always equal the URLs the app actually serves.
 *
 * Route grammar:
 *   /                                  home
 *   /category/<seg>[/<seg>...]         category (nested dirs allowed)
 *   /article/<seg>[/<seg>...]          article (last segment = file name)
 */

// Only these are rendered as articles. Everything else (pdf, docx, images,
// .obsidian config) is excluded from the tree so we never emit dead links.
export const TEXT_FILE_RE = /\.(md|markdown|html|htm|txt)$/i;

const ASSET_FILE_RE = /\.(png|jpe?g|gif|svg|webp|ico|bmp|avif)$/i;

export function isTextFile(name) {
  return TEXT_FILE_RE.test(name);
}

export function isAssetFile(name) {
  return ASSET_FILE_RE.test(name);
}

/** `RDMA概论.md` → `RDMA概论` */
export function stripExtension(name) {
  return name.replace(TEXT_FILE_RE, '');
}

/**
 * Human-facing title derived from a file name.
 * Keeps CJK intact, turns `_` into spaces, tidies stray dashes.
 */
export function cleanTitle(name) {
  return stripExtension(name)
    .replace(/_/g, ' ')
    .replace(/\s*[—–]{1,2}\s*/g, ' — ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split a repo-relative path into non-empty segments. */
export function splitSegments(relPath) {
  return String(relPath || '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Route params are not consistently decoded: Next passes the decoded form for
 * on-demand renders but the percent-encoded form while prerendering
 * `generateStaticParams` results. Normalising here keeps both paths working —
 * without it, every CJK article double-encodes and 404s during build.
 */
export function decodeMaybe(value) {
  if (typeof value !== 'string' || !value.includes('%')) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Encode each segment separately — never the whole path, or `/` breaks. */
export function encodeSegments(segments) {
  return (segments || []).map((s) => encodeURIComponent(s)).join('/');
}

/** Segments for an article route: dir segments + extension-less file name. */
export function articleSegments(dirPath, fileName) {
  return [...splitSegments(dirPath), stripExtension(fileName)];
}

/** `/article/RDMA/毕设/环境构建与代码编译` (encoded, leading slash). */
export function articlePath(dirPath, fileName) {
  return '/article/' + encodeSegments(articleSegments(dirPath, fileName));
}

/** `/category/RDMA/毕设` (encoded, leading slash). */
export function categoryPath(dirPath) {
  return '/category/' + encodeSegments(splitSegments(dirPath));
}

/** Absolute URL for canonical / JSON-LD / sitemap. */
export function absoluteUrl(siteUrl, path) {
  if (!path) return siteUrl;
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Parse the catch-all article slug back into its parts.
 * The last segment is always the file name; the rest is the directory.
 */
export function parseArticleSlug(slug) {
  const segments = (Array.isArray(slug) ? slug : [slug])
    .filter((s) => typeof s === 'string' && s !== '')
    .map(decodeMaybe);
  if (segments.length === 0) return { dirPath: '', artName: '', segments: [] };
  return {
    dirPath: segments.slice(0, -1).join('/'),
    artName: segments[segments.length - 1],
    segments,
  };
}

/** Parse the catch-all category slug. */
export function parseCategorySlug(slug) {
  const segments = (Array.isArray(slug) ? slug : [slug])
    .filter((s) => typeof s === 'string' && s !== '')
    .map(decodeMaybe);
  return { dirPath: segments.join('/'), segments };
}

/** Stable display label for a directory path. */
export function categoryTitle(dirPath) {
  return splitSegments(dirPath).join(' / ');
}

const ABSOLUTE_HREF_RE = /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i;

/**
 * Rewrite a relative link found inside an article into a site route.
 *
 * Obsidian notes link each other as `../其它/笔记.md`. Left alone those become
 * `/article/<current-dir>/../其它/笔记.md`, which 404s. Absolute, protocol and
 * in-page links are returned unchanged.
 *
 * @param {string} dirPath directory of the article containing the link
 * @param {string} href raw href from the Markdown
 * @returns {string|null} site path, or null when the link should be left as-is
 */
export function resolveRelativeArticleLink(dirPath, href) {
  if (!href || ABSOLUTE_HREF_RE.test(href)) return null;

  const [rawPath, ...hashParts] = href.split('#');
  const hash = hashParts.join('#');
  if (!rawPath) return null;

  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    decoded = rawPath;
  }
  if (!isTextFile(decoded)) return null;

  const stack = splitSegments(dirPath);
  const parts = decoded.split('/');
  const fileName = parts.pop();
  if (!fileName) return null;

  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }

  return articlePath(stack.join('/'), fileName) + (hash ? `#${hash}` : '');
}
