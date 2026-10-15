/**
 * Data layer: Git repository content fetching via REST API.
 *
 * PRIMARY: GitHub REST API + raw.githubusercontent.com (JSON, fast)
 * FALLBACK: Gitee REST API + raw content (if GitHub repo not found)
 *
 * Uses Next.js data cache with 1-hour revalidation.
 * Configure via env vars: REPO_OWNER, REPO_NAME, REPO_BRANCH
 */

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

const REQUEST_TIMEOUT = 8000;
const TREE_CACHE_TTL = 60 * 60 * 1000; // 1 hour in-memory

// ── Internal state ────────────────────────────────────
let cachedTree = null;
let cachedTreeAt = 0;
let activeSource = null; // auto-detected on first request
const articleCache = new Map();

// ── API helpers ───────────────────────────────────────

async function fetchJson(url, headers) {
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function fetchRaw(rawBase, path) {
  const url = `${rawBase}/${path}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.text();
}

async function detectSource() {
  for (const src of API_SOURCES) {
    try {
      await fetchJson(src.treeUrl, src.headers);
      console.log(`[data] Using source: ${src.name}`);
      return src;
    } catch {
      continue;
    }
  }
  throw new Error('No available data source found');
}

async function getSource() {
  if (activeSource) return activeSource;
  activeSource = await detectSource();
  return activeSource;
}

// ── Public API ────────────────────────────────────────

export async function getDirectoryTree() {
  const now = Date.now();
  if (cachedTree && now - cachedTreeAt < TREE_CACHE_TTL &&
      (cachedTree.articles.length > 0 || Object.keys(cachedTree.directories).length > 0)) {
    return cachedTree;
  }

  try {
    const src = await getSource();
    const data = await fetchJson(src.treeUrl, src.headers);

    const tree = { articles: [], directories: {} };

    for (const item of data.tree || []) {
      if (item.type !== 'blob') continue;
      const path = item.path;
      if (!path || path.startsWith('.') || path === 'LICENSE') continue;
      if (/\.(png|jpg|jpeg|gif|svg|ico)$/i.test(path)) continue;

      const slash = path.indexOf('/');
      if (slash === -1) {
        if (path.includes('.')) tree.articles.push(path);
      } else {
        const dirName = path.substring(0, slash);
        const fileName = path.substring(slash + 1);
        if (!fileName) continue;
        if (!tree.directories[dirName]) {
          tree.directories[dirName] = { articles: [] };
        }
        tree.directories[dirName].articles.push(fileName);
      }
    }

    // Only cache if we got real data
    if (tree.articles.length > 0 || Object.keys(tree.directories).length > 0) {
      cachedTree = tree;
      cachedTreeAt = now;
    }
    return tree;
  } catch (err) {
    console.error('getDirectoryTree failed:', err.message);
    // Return stale cache if available, even if empty
    if (cachedTree) return cachedTree;
    return { articles: [], directories: {} };
  }
}

export async function getArticleContent(dirName, articleName) {
  const cacheKey = dirName ? `${dirName}/${articleName}` : articleName;
  const cached = articleCache.get(cacheKey);
  if (cached) return cached;

  const src = await getSource();
  const extensions = ['.md', '.html', '.txt', ''];

  for (const ext of extensions) {
    const name = articleName + ext;
    const path = dirName
      ? `${encodeURIComponent(dirName)}/${encodeURIComponent(name)}`
      : encodeURIComponent(name);
    try {
      const content = await fetchRaw(src.rawBase, path);
      if (content) {
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

  console.warn(`Article not found: ${cacheKey}`);
  return null;
}

export function generateSlug(name) {
  return name
    .replace(/\.(md|html)$/, '')
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}