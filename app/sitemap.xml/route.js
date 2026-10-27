import { getDirectoryTree } from '@/lib/gitee';
import { SITE_CONFIG } from '@/lib/seo';
import { articlePath, categoryPath, absoluteUrl } from '@/lib/urls';

export const revalidate = 3600;

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Every URL here is produced by the same helpers the pages use for their
 * links. That is the whole point: an earlier version ran names through a
 * lowercase/kebab transform, so every article URL in the sitemap 404'd
 * (`/article/RDMA/rdma概论` instead of `/article/RDMA/RDMA概论`).
 *
 * `lastmod` is intentionally omitted — the source tree API does not expose
 * commit dates, and inventing "now" makes crawlers distrust the field.
 */
export async function GET() {
  const tree = await getDirectoryTree();

  const entries = [];

  entries.push({ loc: SITE_CONFIG.url, changefreq: 'daily', priority: '1.0' });

  for (const dirPath of Object.keys(tree.directories || {})) {
    entries.push({
      loc: absoluteUrl(SITE_CONFIG.url, categoryPath(dirPath)),
      changefreq: 'weekly',
      priority: '0.7',
    });
  }

  for (const [dirPath, dirData] of Object.entries(tree.directories || {})) {
    for (const fileName of dirData.articles || []) {
      entries.push({
        loc: absoluteUrl(SITE_CONFIG.url, articlePath(dirPath, fileName)),
        changefreq: 'monthly',
        priority: '0.6',
      });
    }
  }

  for (const fileName of tree.articles || []) {
    entries.push({
      loc: absoluteUrl(SITE_CONFIG.url, articlePath('', fileName)),
      changefreq: 'monthly',
      priority: '0.6',
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    ({ loc, changefreq, priority }) => `  <url>
    <loc>${escapeXml(loc)}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
