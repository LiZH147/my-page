/**
 * Data layer: Git repository content fetching via REST API.
 *
 * PRIMARY: GitHub REST API + raw.githubusercontent.com
 * FALLBACK: Gitee REST API + raw content (if the GitHub repo is not found)
 *
 * Configure via env vars: REPO_OWNER, REPO_NAME, REPO_BRANCH
 *
 * Only text files (md/html/txt) become articles. Images and binaries are
 * excluded from the tree so we never emit links that 404.
 */

import { isTextFile, isAssetFile, splitSegments, encodeSegments } from './urls.js';
import { isExcluded } from './excluded.js';
import { isHidden } from './hidden.js';
import treeSnapshot from '../data/tree-snapshot.js';

// ── Config (override via Vercel env vars) ────────────
const REPO_OWNER = process.env.REPO_OWNER || 'lizihan147';
const REPO_NAME = process.env.REPO_NAME || 'Obsidian-depository';
const REPO_BRANCH = process.env.REPO_BRANCH || 'main';

const API_SOURCES = [
  {
    name: 'github',
    treeUrl: `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${REPO_BRANCH}?recursive=1`,
    rawBase: `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}`,
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'zihan-home/1.0' },
  },
  {
    name: 'gitee',
    treeUrl: `https://gitee.com/api/v5/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${REPO_BRANCH}?recursive=1`,
    rawBase: `https://gitee.com/${REPO_OWNER}/${REPO_NAME}/raw/${REPO_BRANCH}`,
    headers: { 'User-Agent': 'zihan-home/1.0' },
  },
];

const REQUEST_TIMEOUT = 8000; // content / tree body fetches
const PROBE_TIMEOUT_MS = 2500; // one source-liveness probe must finish fast:
// Vercel Hobby kills serverless renders around ~10s, and probing two dead hosts
// serially at the full timeout used to blow that budget → every cold dynamic
// request answered 504 while the APIs were rate-limited.

// How long to stop re-probing after a total failure. Without this memory,
// every request during an outage paid both timeouts and hit Vercel's limit;
// with it, only the first request pays, everyone else gets the snapshot fast.
const OFFLINE_BACKOFF_MS = 5 * 60 * 1000;

const TREE_CACHE_TTL = 60 * 60 * 1000; // 1 hour in-memory

// ── Internal state ────────────────────────────────────
let cachedTree = null;
let cachedTreeAt = 0;
let activeSource = null;
let lastGoodRawBase = null; // memory-free hint for getArticleContent ordering
let lastProbeAt = -Infinity;
let probePromise = null; // concurrent callers share one in-flight probe
const articleCache = new Map();

// ── API helpers ───────────────────────────────────────

async function fetchJson(url, headers, timeoutMs = REQUEST_TIMEOUT) {
  const res = await fetch(url, {
    headers,
    // No `next.revalidate`: Next's Data Cache kept serving stale/empty
    // responses for an hour. The in-memory TTL below is enough.
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function fetchRaw(rawBase, path) {
  const url = `${rawBase}/${path}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) });
  if (!res.ok) {
    if (res.status === 451) {
      console.warn(`[data] Blocked by host (451): ${path} — add it to lib/excluded.js`);
    }
    throw new Error(`${res.status}`);
  }
  return res.text();
}

/** Which configured source last proved healthy, per the committed snapshot. */
function preferredSourceName() {
  const host = treeSnapshot && treeSnapshot.source;
  if (!host) return null;
  return API_SOURCES.find((s) => new URL(s.rawBase).hostname === host)?.name || null;
}

async function detectSource() {
  // Try the host that served the last good snapshot first: in an outage where
  // only one of the two mirrors is reachable, GitHub-first ordering could hand
  // us the slower/mirror-less host or a doubly-wasted timeout.
  const preferred = preferredSourceName();
  const order = preferred
    ? [preferred, ...API_SOURCES.map((s) => s.name).filter((n) => n !== preferred)]
    : API_SOURCES.map((s) => s.name);

  for (const name of order) {
    const src = API_SOURCES.find((s) => s.name === name);
    try {
      await fetchJson(src.treeUrl, src.headers, PROBE_TIMEOUT_MS);
      console.log(`[data] Using source: ${src.name}`);
      return src;
    } catch {
      continue;
    }
  }
  throw new Error('No available data source found');
}

/**
 * Resolve the content source. Failure memory matters here: after both mirrors
 * refuse, `getDirectoryTree` serves the committed snapshot and `rawBase` falls
 * back to config-derived URLs, so single requests must not re-hammer dead hosts.
 */
async function getSource() {
  if (activeSource) return activeSource;
  if (Date.now() - lastProbeAt < OFFLINE_BACKOFF_MS) {
    throw new Error('data source offline (probe throttled)');
  }
  if (!probePromise) {
    probePromise = (async () => {
      lastProbeAt = Date.now();
      try {
        activeSource = await detectSource();
        return activeSource;
      } finally {
        probePromise = null;
      }
    })();
  }
  return probePromise;
}

/**
 * Raw base without any network call. The raw URL is pure config — it must never
 * depend on API liveness, or an image would break exactly when the site needs
 * resilience most. Falls back to the snapshot's recorded host, then to Gitee.
 */
function fallbackRawBase() {
  const preferred = preferredSourceName();
  if (preferred) return API_SOURCES.find((s) => s.name === preferred).rawBase;
  return API_SOURCES[API_SOURCES.length - 1].rawBase;
}

// ── Public API ────────────────────────────────────────

/**
 * @returns {Promise<{articles: string[], directories: Record<string, {articles: string[]}>}>}
 *   `articles`     root-level file names, e.g. ["README.md"]
 *   `directories`  keyed by the FULL nested dir path, e.g. "RDMA", "RDMA/毕设";
 *                  each value's `articles` holds file names relative to that dir.
 */
export async function getDirectoryTree() {
  const now = Date.now();
  const hasData = (t) => !!t && (t.articles.length > 0 || Object.keys(t.directories).length > 0);

  if (hasData(cachedTree) && now - cachedTreeAt < TREE_CACHE_TTL) {
    return cachedTree;
  }

  try {
    const src = await getSource();
    const data = await fetchJson(src.treeUrl, src.headers);

    const tree = { articles: [], directories: {}, assets: [] };

    for (const item of data.tree || []) {
      if (item.type !== 'blob') continue;
      const path = item.path;
      if (!path) continue;

      const segments = splitSegments(path);
      if (segments.length === 0) continue;

      // Skip hidden dirs (.obsidian), license files and any binary asset
      if (segments[0].startsWith('.')) continue;
      if (/^LICEN[CS]E/i.test(segments[segments.length - 1])) continue;
      if (isAssetFile(path)) {
        // Not an article, but still needed: notes embed these by bare file name
        // (`![[Pasted image 20241015143448.png]]`), which cannot be resolved
        // without the full inventory of where each asset actually lives.
        tree.assets.push(path);
        continue;
      }
      // Host-refused or non-content paths must not be advertised
      if (isExcluded(path)) continue;

      // Hidden notes are filtered here, at the single point where the site
      // learns what exists, so the home page, category grids, sitemap, internal
      // links and structured data can never disagree about what is published.
      if (isHidden(path)) continue;

      const fileName = segments[segments.length - 1];

      // Only real text documents become articles; everything else is a resource
      // a note may embed (images, PDFs, archives).
      if (!isTextFile(fileName)) {
        tree.assets.push(path);
        continue;
      }

      if (segments.length === 1) {
        if (!tree.articles.includes(fileName)) tree.articles.push(fileName);
      } else {
        // Nested: keep the full directory path so deep structures survive
        const dirPath = segments.slice(0, -1).join('/');
        if (!tree.directories[dirPath]) tree.directories[dirPath] = { articles: [] };
        if (!tree.directories[dirPath].articles.includes(fileName)) {
          tree.directories[dirPath].articles.push(fileName);
        }
      }
    }

    // Never cache an empty tree — that is what kept the site blank for hours.
    if (hasData(tree)) {
      cachedTree = tree;
      cachedTreeAt = now;
      return tree;
    }
    // Live call succeeded but said "nothing here". Trusting that would publish an
    // empty site, so fall through to the committed snapshot below.
    return snapshotTree(cachedTree);
  } catch (err) {
    console.error('getDirectoryTree failed:', err.message);
    return snapshotTree(cachedTree);
  }
}

/**
 * The committed snapshot, re-filtered through today's exclusion rules.
 *
 * A snapshot records what existed when it was saved; the hide list and the
 * host-blocked list may have grown since. Without this step a note hidden today
 * would reappear on the next rate-limit, which is exactly the failure users
 * would never think to look for.
 */
function snapshotTree(preferred) {
  if (preferred) return preferred;
  if (!treeSnapshot || !treeSnapshot.articles) return { articles: [], directories: {}, assets: [] };

  const keep = (dirPath, fileName) => {
    const full = dirPath ? `${dirPath}/${fileName}` : fileName;
    return !isExcluded(full) && !isHidden(full);
  };

  const articles = (treeSnapshot.articles || []).filter((name) => keep('', name));
  const directories = {};
  for (const [dirPath, value] of Object.entries(treeSnapshot.directories || {})) {
    const kept = (value.articles || []).filter((name) => keep(dirPath, name));
    if (kept.length > 0) directories[dirPath] = { articles: kept };
  }
  const assets = (treeSnapshot.assets || []).filter((p) => !isHidden(p));

  if (articles.length === 0 && Object.keys(directories).length === 0) {
    console.error('[data] Snapshot is empty — the site has no content. Run scripts/save-tree-snapshot.mjs');
    return { articles: [], directories: {}, assets: [] };
  }

  const restored = { articles, directories, assets };
  // Cache it: while the API is down, every page would otherwise re-filter the
  // whole snapshot, and the article pages would pay that cost per request.
  cachedTree = restored;
  cachedTreeAt = Date.now();
  console.warn(`[data] API unavailable — serving committed snapshot from ${treeSnapshot.savedAt || 'unknown time'}`);
  return restored;
}

/** Every article with its directory, flattened. */
export async function getAllArticles() {
  const tree = await getDirectoryTree();
  const out = [];
  for (const article of tree.articles) out.push({ dirPath: '', fileName: article });
  for (const [dirPath, data] of Object.entries(tree.directories)) {
    for (const fileName of data.articles) out.push({ dirPath, fileName });
  }
  return out;
}

/** Flat list of every directory path, including nested ones. */
export async function getAllCategories() {
  const tree = await getDirectoryTree();
  return Object.keys(tree.directories);
}

/**
 * Raw content base URL for a directory, used to turn the Markdown
 * file's relative image references into absolute, fetchable URLs.
 */
export async function getRawBaseForDir(dirPath) {
  let src = null;
  try {
    src = await getSource();
  } catch {
    // Offline: images must still resolve, and raw URLs are pure config anyway.
  }
  const base = src ? src.rawBase : fallbackRawBase();
  const segments = splitSegments(dirPath);
  return segments.length ? `${base}/${encodeSegments(segments)}` : base;
}

/**
 * Raw content base URL for the repository root. Obsidian resolves some embeds
 * vault-root-relative (`![[快应用/image.png]]` written inside another folder's
 * note), and those URLs can only be built from this base.
 */
export async function getRepoRawBase() {
  try {
    const src = await getSource();
    return src.rawBase;
  } catch {
    return fallbackRawBase();
  }
}

/**
 * Ordered raw-content bases for READING notes. Deliberately not gated on a
 * successful API probe: article text and images live behind plain raw URLs that
 * are pure config — they rarely trip rate limits and keep working while the API
 * side is dark. Probes exist only to pick the tree mirror, and pinning article
 * reads to them turned every offline API into a dead site with angry images.
 * Order: confirmed source first, then snapshot's proven host, then the mirror
 * that worked most recently, then the rest.
 */
function rawBaseOrder() {
  const byName = (n) => API_SOURCES.find((s) => s.name === n);
  const order = [];
  const push = (b) => {
    if (b && !order.includes(b)) order.push(b);
  };

  if (activeSource) push(activeSource.rawBase);
  push(byName(preferredSourceName())?.rawBase);
  push(lastGoodRawBase);
  for (const s of API_SOURCES) push(s.rawBase);
  return order;
}

export async function getArticleContent(dirPath, articleName) {
  const cleanDir = splitSegments(dirPath).join('/');
  const cacheKey = cleanDir ? `${cleanDir}/${articleName}` : articleName;

  // The tree already omits hidden notes, so a hidden note is unreachable by
  // navigation. This check makes the URL itself unreachable too — otherwise the
  // article would still render for anyone holding a direct link, and "hide"
  // would just mean "unlisted".
  const stem = articleName.replace(/\.(md|markdown|html|htm|txt)$/i, '');
  const guessExtension = /\.(md|markdown|html|htm|txt)$/i.test(articleName) ? '' : '.md';
  const candidates = [cacheKey, `${stem}${guessExtension}`];
  if (cleanDir) candidates.push(`${cleanDir}/${stem}${guessExtension}`);
  if (candidates.some((p) => isHidden(p))) {
    console.log(`[data] Hidden by lib/hidden.js: ${cacheKey}`);
    return null;
  }

  const articleCacheHit = articleCache.get(cacheKey);
  if (articleCacheHit) return articleCacheHit;

  const attempts = ['.md', '.markdown', '.html', '.htm', '.txt', ''].map((ext) => stem + ext);

  const dirSegment = cleanDir ? `${encodeSegments(splitSegments(cleanDir))}/` : '';

  for (const base of rawBaseOrder()) {
    for (const name of attempts) {
      const path = `${dirSegment}${encodeURIComponent(name)}`;
      try {
        const content = await fetchRaw(base, path);
        if (content) {
          lastGoodRawBase = base;
          if (articleCache.size >= 200) {
            articleCache.delete(articleCache.keys().next().value);
          }
          articleCache.set(cacheKey, content);
          return content;
        }
      } catch {
        continue;
      }
    }
  }

  console.warn(`Article not found: ${cacheKey}`);
  return null;
}

// Kept for backwards compatibility with older imports.
export function generateSlug(name) {
  return name
    .replace(/\.(md|html)$/, '')
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}
