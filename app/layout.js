import '../src/globals.css';
import Link from 'next/link';
import Image from 'next/image';
import { SITE_CONFIG, generateSiteSchema } from '@/lib/seo';

export const metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: `${SITE_CONFIG.title} | ${SITE_CONFIG.shortName}`,
    // Pages build their full title via generatePageMetadata(), which already
    // appends the site name. A `%s - <site>` template here doubled it.
    template: '%s',
  },
  description: SITE_CONFIG.description,
  keywords: SITE_CONFIG.keywords,
  authors: [{ name: SITE_CONFIG.author }],
  creator: SITE_CONFIG.author,
  publisher: SITE_CONFIG.author,
  formatDetection: { email: false, address: false, telephone: false },
  icons: { icon: '/logo192.png', apple: '/logo192.png' },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: SITE_CONFIG.locale,
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.name,
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
    images: [
      {
        url: SITE_CONFIG.ogImage,
        width: SITE_CONFIG.ogImageWidth,
        height: SITE_CONFIG.ogImageHeight,
        alt: SITE_CONFIG.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
    images: [SITE_CONFIG.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

export default function RootLayout({ children }) {
  const siteSchema = generateSiteSchema();

  return (
    <html lang="zh-CN">
      <head>
        {/* Article images are served from the repo host — warm the connection
            before the parser reaches the first <img>. */}
        <link rel="preconnect" href="https://gitee.com" />
        <link rel="dns-prefetch" href="https://raw.githubusercontent.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-white text-gray-900 antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link
            href="/"
            className="flex items-center gap-3 text-gray-900 hover:text-blue-600 transition-colors"
            title="梓木辛 - 返回首页"
            prefetch={true}
          >
            <Image
              src="/logo192.png"
              alt="Zihan Home Logo"
              width={32}
              height={32}
              className="rounded-full object-cover"
            />
            <span className="text-lg font-semibold tracking-tight">Zihan Home</span>
          </Link>

          <nav className="flex items-center gap-6" aria-label="主要导航">
            <Link href="/" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              首页
            </Link>
            <Link
              href="/about"
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              关于
            </Link>
            <a
              href="https://github.com/LiZH147"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
              aria-label="GitHub 主页"
            >
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-gray-200 bg-gray-50 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © {year} {SITE_CONFIG.author}
          </p>
          <div className="flex items-center gap-4">
            <Link href="/sitemap.xml" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
              Sitemap
            </Link>
            <a
              href="https://github.com/LiZH147"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}