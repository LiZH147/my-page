/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    remotePatterns: [
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
      { protocol: 'https', hostname: 'gitee.com' },
    ],
  },

  // Compress responses
  compress: true,

  // HTTP headers for static assets
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // NOTE: anything served from public/ under a stable name is cached for a
        // day and may be served stale for a week, and social scrapers cache
        // images by URL for far longer. Changing the bytes without changing the
        // filename never reaches readers, so bump the filename instead
        // (e.g. og-image-v2.png) — see SITE_CONFIG.ogImage.
        source: '/:file.(jpg|jpeg|png|webp|avif|svg|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },

  // Bundle optimization
  experimental: {
    optimizePackageImports: ['highlight.js', 'markdown-it'],
  },

  // Power from Vercel
  poweredByHeader: false,
};

module.exports = nextConfig;