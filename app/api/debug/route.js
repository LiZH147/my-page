import { getDirectoryTree } from '@/lib/gitee';

export async function GET() {
  const start = Date.now();

  // Test 1: tree via our module
  let treeResult = 'fail';
  try {
    const tree = await getDirectoryTree();
    treeResult = `ok (${tree.articles.length} articles, ${Object.keys(tree.directories).length} dirs)`;
  } catch (e) {
    treeResult = `error: ${e.message}`;
  }

  // Test 2: raw Gitee tree API response (direct fetch)
  let rawApi = 'fail';
  const token = process.env.GITEE_TOKEN || '';
  const tokenParam = token ? `&access_token=${token}` : '';
  try {
    const res = await fetch(
      `https://gitee.com/api/v5/repos/lizihan147/Obsidian-depository/git/trees/main?recursive=1${tokenParam}`,
      { headers: { 'User-Agent': 'zihan-home/1.0' }, signal: AbortSignal.timeout(8000) }
    );
    const json = await res.json();
    const tree = json.tree || [];
    const blobs = tree.filter(i => i.type === 'blob' && !i.path.startsWith('.'));
    rawApi = `ok (status ${res.status}, ${tree.length} total, ${blobs.length} blobs)`;
    // Show first 5 paths
    const samples = blobs.slice(0, 5).map(i => i.path).join(' | ');
    if (samples) rawApi += ` — eg: ${samples}`;
  } catch (e) {
    rawApi = `error: ${e.message}`;
  }

  // Test 3: raw content
  let rawContent = 'fail';
  try {
    const res = await fetch(
      'https://gitee.com/lizihan147/Obsidian-depository/raw/main/README.md',
      { signal: AbortSignal.timeout(5000) }
    );
    rawContent = res.ok
      ? `ok (status ${res.status}, ${(await res.text()).length} bytes)`
      : `status ${res.status}`;
  } catch (e) {
    rawContent = `error: ${e.message}`;
  }

  return Response.json({
    time_ms: Date.now() - start,
    gitee_tree: treeResult,
    gitee_raw_api: rawApi,
    gitee_raw_content: rawContent,
    has_token: !!token,
    region: process.env.VERCEL_REGION || 'unknown',
  });
}