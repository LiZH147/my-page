import { getDirectoryTree } from '@/lib/gitee';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  const tree = await getDirectoryTree();

  // Build a deduplicated flat article list
  const allArticles = [];
  const seen = new Set();

  for (const article of tree.articles || []) {
    if (!seen.has(article)) {
      seen.add(article);
      allArticles.push({ name: article, dir: '' });
    }
  }
  for (const [dir, data] of Object.entries(tree.directories || {})) {
    for (const article of data.articles || []) {
      const key = `${dir}/${article}`;
      if (!seen.has(key)) {
        seen.add(key);
        allArticles.push({ name: article, dir });
      }
    }
  }

  return Response.json({
    success: true,
    articles: allArticles,
    directories: tree.directories,
    total: allArticles.length,
    updatedAt: new Date().toISOString(),
  });
}