// SEO constants and structured-data generators.
//
// Conventions:
// - Every canonical/JSON-LD URL is built from SITE_CONFIG.url + a path that
//   came out of lib/urls.js, so structured data can never drift from routes.
// - Never emit a date we do not actually know: a wrong datePublished is worse
//   than an omitted one.

import { absoluteUrl } from './urls.js';

export const SITE_CONFIG = {
  name: '梓木辛 - Zihan Home',
  shortName: 'Zihan Home',
  title: '梓木辛的个人知识库',
  description:
    '梓木辛的个人知识库，沉淀编程、前端、系统与科研方向的技术文章、学习笔记与实践记录。',
  url: 'https://zihan-home.vercel.app',
  author: 'Zihan Li',
  locale: 'zh_CN',
  language: 'zh-CN',
  image: '/logo512.png',
  ogImage: '/og-image.png',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  logo: '/logo512.png',
  keywords: [
    '技术博客',
    '知识库',
    '学习笔记',
    'JavaScript',
    '前端开发',
    'RDMA',
    '系统设计',
    '个人网站',
    'Zihan',
  ],
};

const OG_IMAGE_ABS = absoluteUrl(SITE_CONFIG.url, SITE_CONFIG.ogImage);
const LOGO_ABS = absoluteUrl(SITE_CONFIG.url, SITE_CONFIG.logo);

function buildOpenGraphImage(alt, image) {
  if (image) {
    const url = absoluteUrl(SITE_CONFIG.url, image);
    return [{ url, alt }];
  }
  return [
    {
      url: OG_IMAGE_ABS,
      width: SITE_CONFIG.ogImageWidth,
      height: SITE_CONFIG.ogImageHeight,
      alt,
    },
  ];
}

export function generatePageMetadata({
  title,
  description,
  path = '',
  image = null,
  type = 'website',
  publishedTime = null,
  modifiedTime = null,
  keywords = null,
  section = null,
  tags = null,
}) {
  const fullTitle = title
    ? `${title} - ${SITE_CONFIG.name}`
    : `${SITE_CONFIG.title} | ${SITE_CONFIG.shortName}`;

  const fullDescription = (description || SITE_CONFIG.description).slice(0, 300);
  const url = absoluteUrl(SITE_CONFIG.url, path);
  const images = buildOpenGraphImage(fullTitle, image);
  const metaKeywords = keywords || SITE_CONFIG.keywords;

  return {
    title: fullTitle,
    description: fullDescription,
    keywords: metaKeywords,
    authors: [{ name: SITE_CONFIG.author, url: SITE_CONFIG.url }],
    creator: SITE_CONFIG.author,
    publisher: SITE_CONFIG.author,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description: fullDescription,
      url,
      siteName: SITE_CONFIG.name,
      images,
      locale: SITE_CONFIG.locale,
      type,
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(section && { section }),
      ...(tags && tags.length > 0 && { tags }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: fullDescription,
      images: [images[0].url],
    },
    robots: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  };
}

/**
 * Article structured data.
 * `dates` is only populated when the caller genuinely knows them.
 */
export function generateArticleSchema({
  title,
  description,
  path,
  image = null,
  publishedTime = null,
  modifiedTime = null,
  author = SITE_CONFIG.author,
  section = null,
  keywords = null,
  wordCount = null,
}) {
  const url = absoluteUrl(SITE_CONFIG.url, path);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: title,
    description: (description || SITE_CONFIG.description).slice(0, 300),
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: SITE_CONFIG.language,
    author: { '@type': 'Person', name: author, url: SITE_CONFIG.url },
    publisher: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
      logo: {
        '@type': 'ImageObject',
        url: LOGO_ABS,
        width: 512,
        height: 512,
      },
    },
    image: image
      ? [absoluteUrl(SITE_CONFIG.url, image)]
      : [OG_IMAGE_ABS],
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${SITE_CONFIG.url}#website`,
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
  };

  if (publishedTime) schema.datePublished = publishedTime;
  if (modifiedTime || publishedTime) schema.dateModified = modifiedTime || publishedTime;
  if (section) schema.articleSection = section;
  if (keywords && keywords.length > 0) schema.keywords = keywords.join(', ');
  if (typeof wordCount === 'number' && wordCount > 0) schema.wordCount = wordCount;

  return schema;
}

export function generateBreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: absoluteUrl(SITE_CONFIG.url, item.url) } : {}),
    })),
  };
}

/** ItemList of the articles inside one category. */
export function generateItemListSchema({ items, name, path }) {
  const url = absoluteUrl(SITE_CONFIG.url, path);
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${url}#itemlist`,
    name,
    numberOfItems: items.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(SITE_CONFIG.url, item.path),
    })),
  };
}

/** CollectionPage wrapper so the category page is understood as an index. */
export function generateCollectionPageSchema({ name, description, path, articles = [] }) {
  const url = absoluteUrl(SITE_CONFIG.url, path);
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    name,
    description,
    url,
    inLanguage: SITE_CONFIG.language,
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${SITE_CONFIG.url}#website`,
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: articles.length,
      itemListElement: articles.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: absoluteUrl(SITE_CONFIG.url, item.path),
      })),
    },
  };
}

export function generateSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_CONFIG.url}#website`,
    name: SITE_CONFIG.name,
    alternateName: SITE_CONFIG.shortName,
    description: SITE_CONFIG.description,
    url: SITE_CONFIG.url,
    inLanguage: SITE_CONFIG.language,
    publisher: {
      '@type': 'Person',
      name: SITE_CONFIG.author,
      url: SITE_CONFIG.url,
    },
  };
}

/** Person schema — helps knowledge-panel style understanding of the author. */
export function generatePersonSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE_CONFIG.url}#person`,
    name: SITE_CONFIG.author,
    url: SITE_CONFIG.url,
    image: LOGO_ABS,
    sameAs: ['https://github.com/LiZH147'],
  };
}
