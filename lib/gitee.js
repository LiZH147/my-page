/**
 * Multi-repo data layer.
 *
 * Define repos below. Articles from all repos are merged into one
 * unified directory tree. Directory-name collisions are combined.
 *
 * An article's source repo is tracked internally so fetching its
 * content hits the right raw-content URL.
 *
 * Config via Vercel env vars (JSON array) or the inline defaults.
 */

// ── Auth ─────────────────────────────────────────────
// Set these on Vercel for private repo access.
// GitHub: Settings → Developer settings → Personal access tokens → Fine-grained
//         read-only Contents + Metadata permission on the target repo.
// Gitee:  Settings → Private Token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITEE_TOKEN  = process.env.GITEE_TOKEN;

// ── REPO CONFIG ───────────────────────────────────────
// Add new repos here, or set REPOS env var as JSON array on Vercel.
// Each entry: { owner, name, branch?, platform? }
// platform: "github" (default) | "gitee"
const DEFAULT_REPOS = [
  { owner: 'lizihan147', name: 'Obsidian-depository', branch: 'main', platform: 'gitee' },
  // Private repo example — auth handled automatically via GITHUB_TOKEN / GITEE_TOKEN:
  // { owner: 'lizihan147', name: 'private-notes', branch: 'main' },
];

function parseRepos() {
  if (process.env.REPOS) {
    try { return JSON.parse(process.env.REPOS); } catch { /* fall through */ }
  }
  // Backward-compat single-repo env vars
  if (process.env.REPO_OWNER) {
    return [{
      owner: process.env.REPO_OWNER,
      name: process.env.REPO_NAME || 'Obsidian-depository',
      branch: process.env.REPO_BRANCH || 'main',
      platform: process.env.REPO_PLATFORM || 'gitee',
    }];
  }
  return DEFAULT_REPOS;
}

const REPOS = parseRepos();

// ── Source builders ───────────────────────────────────
function buildSource(repo) {
  const { owner, name, branch = 'main', platform = 'github' } = repo;
  if (platform === 'gitee') {
    const headers = { 'User-Agent': 'zihan-home/1.0' };
    const tokenParam = GITEE_TOKEN ? `?access_token=${GITEE_TOKEN}` : '';
    const treeUrl = `https://gitee.com/api/v5/repos/${owner}/${name}/git/trees/${branch}?recursive=1` + (GITEE_TOKEN ? `&access_token=${GITEE_TOKEN}` : '');
    const rawBase = `https://gitee.com/${owner}/${name}/raw/${branch}`;
    if (GITEE_TOKEN) {
      headers['Authorization'] = `Bearer ${GITEE_TOKEN}`;
    }
    return { repo: `${owner}/${name}`, treeUrl, rawBase, tokenParam, headers };
  }
  // github
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'zihan-home/1.0',
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }
  return {
    repo: `${owner}/${name}`,
    treeUrl: `https://api.github.com/repos/${owner}/${name}/git/trees/${branch}?recursive=1`,
    rawBase: `https://raw.githubusercontent.com/${owner}/${name}/${branch}`,
    tokenParam: '',
    headers,
  };
}

const SOURCES = REPOS.map(buildSource);

// ── Constants ──────────────────────────────────────────
const REQUEST_TIMEOUT = 8000;
const TREE_CACHE_TTL = 60 * 60 * 1000;

// ── Internal state ────────────────────────────────────
let cachedTree = null;
let cachedTreeAt = 0;
const articleSourceMap = new Map(); // "dir/name" → sourceIndex
const articleCache = new Map();

// ── API helpers ───────────────────────────────────────

async function fetchJson(url, headers) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers,
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });
      if (res.status === 403) {
        throw new Error(`403 Forbidden — Gitee may be rate-limiting Vercel IPs. Set GITEE_TOKEN env var.`);
      }
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    } catch (err) {
      lastError = err;
      if (attempt < 2) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function fetchTree(source, index) {
  const data = await fetchJson(source.treeUrl, source.headers);
  return { source, index, data };
}

// ── Public API ────────────────────────────────────────

export async function getDirectoryTree() {
  const now = Date.now();
  if (cachedTree && now - cachedTreeAt < TREE_CACHE_TTL) return cachedTree;

  const tree = { articles: [], directories: {} };

  const results = await Promise.allSettled(
    SOURCES.map((src, i) => fetchTree(src, i))
  );

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const { data, index } = result.value;

    for (const item of data.tree || []) {
      if (item.type !== 'blob') continue;
      const path = item.path;
      if (!path || path.startsWith('.') || path === 'LICENSE') continue;
      if (/\.(png|jpg|jpeg|gif|svg|ico)$/i.test(path)) continue;

      const slash = path.indexOf('/');
      if (slash === -1) {
        // Root-level article
        if (path.includes('.')) {
          tree.articles.push(path);
          articleSourceMap.set('/' + path, index);
        }
      } else {
        const dirName = path.substring(0, slash);
        const fileName = path.substring(slash + 1);
        if (!fileName) continue;

        if (!tree.directories[dirName]) {
          tree.directories[dirName] = { articles: [] };
        }
        // Deduplicate same-name articles across repos
        if (!tree.directories[dirName].articles.includes(fileName)) {
          tree.directories[dirName].articles.push(fileName);
        }
        articleSourceMap.set(dirName + '/' + fileName, index);
      }
    }
  }

  cachedTree = tree;
  cachedTreeAt = now;
  return tree;
}

export async function getArticleContent(dirName, articleName) {
  const cacheKey = dirName ? `${dirName}/${articleName}` : `/${articleName}`;
  const cached = articleCache.get(cacheKey);
  if (cached) return cached;

  // Try the known source first, then fall back to all sources
  const knownIdx = articleSourceMap.get(cacheKey);
  const order = knownIdx !== undefined
    ? [SOURCES[knownIdx], ...SOURCES.filter((_, i) => i !== knownIdx)]
    : SOURCES;

  const extensions = ['.md', '.html', '.txt', ''];

  for (const src of order) {
    for (const ext of extensions) {
      const name = articleName + ext;
      const path = dirName
        ? `${encodeURIComponent(dirName)}/${encodeURIComponent(name)}`
        : encodeURIComponent(name);
      try {
        const url = `${src.rawBase}/${path}${src.tokenParam}`;
        const res = await fetch(url, {
          headers: src.headers,               // ← auth token for private repos
          next: { revalidate: 3600 },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });
        if (!res.ok) continue;
        const content = await res.text();
        if (content) {
          if (articleCache.size >= 300) articleCache.delete(articleCache.keys().next().value);
          articleCache.set(cacheKey, content);
          return content;
        }
      } catch { continue; }
    }
  }

  console.warn(`Article not found in any repo: ${cacheKey}`);
  return null;
}

export function generateSlug(name) {
  return name
    .replace(/\.(md|html)$/, '')
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}