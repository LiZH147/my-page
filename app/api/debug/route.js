import { getDirectoryTree } from '@/lib/gitee';

export async function GET() {
  const start = Date.now();

  // Test 1: tree API
  let treeResult = 'fail';
  try {
    const tree = await getDirectoryTree();
    treeResult = `ok (${tree.articles.length} articles, ${Object.keys(tree.directories).length} dirs)`;
  } catch (e) {
    treeResult = `error: ${e.message}`;
  }

  // Test 2: raw content fetch
  let rawResult = 'fail';
  try {
    const res = await fetch(
      'https://gitee.com/lizihan147/Obsidian-depository/raw/main/README.md',
      { signal: AbortSignal.timeout(5000) }
    );
    rawResult = res.ok
      ? `ok (status ${res.status}, ${(await res.text()).length} bytes)`
      : `status ${res.status}`;
  } catch (e) {
    rawResult = `error: ${e.message}`;
  }

  // Test 3: direct Gitee API (no auth)
  let apiResult = 'fail';
  try {
    const res = await fetch(
      'https://gitee.com/api/v5/repos/lizihan147/Obsidian-depository/git/trees/main?recursive=1',
      {
        headers: { 'User-Agent': 'zihan-home/1.0' },
        signal: AbortSignal.timeout(5000),
      }
    );
    apiResult = res.ok
      ? `ok (status ${res.status})`
      : `status ${res.status}: ${await res.text().then(t => t.slice(0, 200))}`;
  } catch (e) {
    apiResult = `error: ${e.message}`;
  }

  return Response.json({
    time_ms: Date.now() - start,
    gitee_tree: treeResult,
    gitee_raw: rawResult,
    gitee_api: apiResult,
    has_gitee_token: !!process.env.GITEE_TOKEN,
    region: process.env.VERCEL_REGION || 'unknown',
  });
}