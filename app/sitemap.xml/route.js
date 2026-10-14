import { getDirectoryTree } from '@/lib/gitee';
import { SITE_CONFIG } from '@/lib/seo';

export const revalidate = 3600;

function generateSlug(name) {
  return name
    .replace(/\.(md|html)$/, '')
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export async function GET() {
  const tree = await getDirectoryTree();

  const urls = [];

  // Homepage
  urls.push({
    url: SITE_CONFIG.url,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily',
    priority: 1.0,
  });

  // Category pages
  for (const dirName of Object.keys(tree.directories || {})) {
    urls.push({
      url: `${SITE_CONFIG.url}/category/${encodeURIComponent(dirName)}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }

  // Article pages (with dir)
  for (const [dirName, dirData] of Object.entries(tree.directories || {})) {
    for (const article of dirData.articles || []) {
      const slug = generateSlug(article);
      urls.push({
        url: `${SITE_CONFIG.url}/article/${encodeURIComponent(dirName)}/${slug}`,
        lastModified: new Date().toISOString(),
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }
  }

  // Root articles
  for (const article of tree.articles || []) {
    const slug = generateSlug(article);
    urls.push({
      url: `${SITE_CONFIG.url}/article/${slug}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.5,
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urls
  .map(
    ({ url, lastModified, changeFrequency, priority }) =>
      `  <url>
    <loc>${url}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>${changeFrequency}</changefreq>
    <priority>${priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}