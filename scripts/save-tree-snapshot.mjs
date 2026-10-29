/**
 * Refresh data/tree-snapshot.js from the live repository.
 *
 * The snapshot is the site's safety net: when the Git host rate-limits the tree
 * API (403 by IP, which empties the whole site), the committed tree keeps the
 * navigation working. Run this whenever the knowledge base changes and commit
 * the result — it costs one API call and keeps the fallback honest.
 *
 *   node scripts/save-tree-snapshot.mjs
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getDirectoryTree, getRepoRawBase } from '../lib/gitee.js';

const tree = await getDirectoryTree();
const articleCount =
  (tree.articles || []).length +
  Object.values(tree.directories || {}).reduce((n, d) => n + (d.articles || []).length, 0);

if (articleCount === 0) {
  console.error('拒绝写入：拿到的是空树（多半是 API 限流），写进去会让站点永久空白。');
  process.exit(1);
}

const rawBase = await getRepoRawBase();
const snapshot = {
  savedAt: new Date().toISOString(),
  source: rawBase ? new URL(rawBase).hostname : null,
  articles: [...(tree.articles || [])].sort(),
  directories: Object.fromEntries(
    Object.entries(tree.directories || {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dir, value]) => [dir, { articles: [...(value.articles || [])].sort() }])
  ),
  assets: [...(tree.assets || [])].sort(),
};

const header = `/**
 * Last known directory tree, committed to the repository.
 *
 * GENERATED FILE — do not edit by hand. Refresh with:
 *   node scripts/save-tree-snapshot.mjs
 *
 * The site's whole navigation comes from one Gitee API call. That API rate-limits
 * anonymous callers by IP and answers 403 when the quota is spent, which turned
 * the entire site blank — no articles, no categories, an empty sitemap. A blank
 * site is worse than a slightly stale one, so the last successful response is
 * baked in here and used whenever the live call fails.
 */

`;

const body = `const snapshot = ${JSON.stringify(snapshot, null, 2)};

export default snapshot;
`;

const target = path.join(process.cwd(), 'data', 'tree-snapshot.js');
await writeFile(target, header + body, 'utf8');

const assetCount = snapshot.assets.length;
const dirCount = Object.keys(snapshot.directories).length;
console.log(`已写入 data/tree-snapshot.js`);
console.log(`  ${articleCount} 篇文章 / ${dirCount} 个目录 / ${assetCount} 个资源`);
console.log(`  来源 ${snapshot.source}，时间 ${snapshot.savedAt}`);
