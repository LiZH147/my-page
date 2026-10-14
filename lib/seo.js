// SEO constants and utilities
export const SITE_CONFIG = {
  name: '梓木辛 - Zihan Home',
  title: '梓木辛的个人知识库',
  description: '梓木辛的个人网站，分享技术文章、学习笔记与知识沉淀。涵盖编程、算法、系统设计等领域。',
  url: 'https://zihan-home.vercel.app',
  author: 'Zihan Li',
  locale: 'zh_CN',
  image: '/logo512.png',
};

export function generatePageMetadata({
  title,
  description,
  path = '',
  image = '/logo512.png',
  type = 'website',
  publishedTime = null,
  modifiedTime = null,
}) {
  const fullTitle = title
    ? `${title} - ${SITE_CONFIG.name}`
    : `${SITE_CONFIG.title} | ${SITE_CONFIG.description}`;

  const fullDescription = description || SITE_CONFIG.description;
  const url = `${SITE_CONFIG.url}${path}`;
  const imageUrl = image.startsWith('http') ? image : `${SITE_CONFIG.url}${image}`;

  return {
    title: fullTitle,
    description: fullDescription,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description: fullDescription,
      url,
      siteName: SITE_CONFIG.name,
      images: [
        {
          url: imageUrl,
          width: 512,
          height: 512,
          alt: fullTitle,
        },
      ],
      locale: SITE_CONFIG.locale,
      type,
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    twitter: {
      card: 'summary',
      title: fullTitle,
      description: fullDescription,
      images: [imageUrl],
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

export function generateArticleSchema({
  title,
  description,
  path,
  publishedTime,
  modifiedTime,
  author = SITE_CONFIG.author,
}) {
  const url = `${SITE_CONFIG.url}${path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description || SITE_CONFIG.description,
    url,
    author: {
      '@type': 'Person',
      name: author,
    },
    publisher: {
      '@type': 'Person',
      name: author,
    },
    datePublished: publishedTime || undefined,
    dateModified: modifiedTime || publishedTime || undefined,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };
}

export function generateBreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url ? `${SITE_CONFIG.url}${item.url}` : undefined,
    })),
  };
}

export function generateSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    url: SITE_CONFIG.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_CONFIG.url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}