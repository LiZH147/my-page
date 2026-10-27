import { SITE_CONFIG } from '@/lib/seo';

/**
 * Generated rather than a static public/robots.txt so the Sitemap line always
 * matches SITE_CONFIG.url. A robots.txt that advertises a sitemap on a dead
 * host is a silent de-indexing bug.
 */
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Internal JSON endpoints return no indexable content.
        disallow: ['/api/'],
      },
    ],
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
    host: SITE_CONFIG.url,
  };
}
