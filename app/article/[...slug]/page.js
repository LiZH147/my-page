import Link from 'next/link';
import {
  getArticleContent,
  getDirectoryTree,
  getRawBaseForDir,
} from '@/lib/gitee';
import {
  renderMarkdown,
  extractPlainText,
  prepareArticle,
  countWords,
} from '@/lib/markdown';
import {
  generatePageMetadata,
  generateArticleSchema,
  generateBreadcrumbSchema,
  SITE_CONFIG,
} from '@/lib/seo';
import {
  articlePath,
  categoryPath,
  categoryTitle,
  cleanTitle,
  parseArticleSlug,
  splitSegments,
  articleSegments,
  resolveRelativeArticleLink,
} from '@/lib/urls';
import { notFound } from 'next/navigation';

export const revalidate = 3600;

/**
 * Rewrite relative `.md` links inside a note so they point at real routes
 * instead of resolving against the page URL (which 404s).
 */
function makeLinkResolver(dirPath) {
  return (href) => resolveRelativeArticleLink(dirPath, href) ?? href;
}

async function loadArticle(dirPath, artName) {
  const raw = await getArticleContent(dirPath, artName);
  if (!raw) return null;

  const rawBase = await getRawBaseForDir(dirPath);
  const prepared = prepareArticle(raw);
  const htmlContent = renderMarkdown(prepared.markdown, {
    rawBase,
    resolveLink: makeLinkResolver(dirPath),
  });
  const plainText = extractPlainText(htmlContent, 400);

  const title = prepared.title || cleanTitle(artName);
  const description = plainText.slice(0, 200);

  return { htmlContent, plainText, title, description };
}

export async function generateStaticParams() {
  try {
    const tree = await getDirectoryTree();
    const params = [];
    for (const fileName of tree.articles) {
      params.push({ slug: articleSegments('', fileName) });
    }
    for (const [dirPath, data] of Object.entries(tree.directories)) {
      for (const fileName of data.articles) {
        params.push({ slug: articleSegments(dirPath, fileName) });
      }
    }
    return params;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { dirPath, artName } = parseArticleSlug(params.slug);
  if (!artName) return generatePageMetadata({ title: '文章未找到', path: '' });

  const article = await loadArticle(dirPath, artName);
  if (!article) return generatePageMetadata({ title: '文章未找到', path: '' });

  const path = articlePath(dirPath, artName);
  const section = dirPath ? categoryTitle(dirPath) : null;

  return generatePageMetadata({
    title: article.title,
    description: article.description,
    path,
    type: 'article',
    section,
    keywords: section
      ? [section, article.title, ...SITE_CONFIG.keywords.slice(0, 4)]
      : [article.title, ...SITE_CONFIG.keywords.slice(0, 4)],
  });
}

export default async function ArticlePage({ params }) {
  const { dirPath, artName, segments } = parseArticleSlug(params.slug);
  if (!artName) notFound();

  const article = await loadArticle(dirPath, artName);
  if (!article) notFound();

  const path = articlePath(dirPath, artName);
  const section = dirPath ? categoryTitle(dirPath) : null;

  const articleSchema = generateArticleSchema({
    title: article.title,
    description: article.description,
    path,
    section,
    keywords: section ? [section, article.title] : [article.title],
    wordCount: countWords(article.plainText),
  });

  // Breadcrumb: 首页 / …每一层分类 / 文章
  const breadcrumbItems = [{ name: '首页', url: '/' }];
  const dirSegments = splitSegments(dirPath);
  for (let i = 0; i < dirSegments.length; i += 1) {
    const partial = dirSegments.slice(0, i + 1).join('/');
    breadcrumbItems.push({
      name: dirSegments[i],
      url: categoryPath(partial),
    });
  }
  breadcrumbItems.push({ name: article.title, url: path });

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

  // Sibling notes in the same folder. Internal links matter as much as external
  // ones for crawl depth and for telling the crawler what this page is about,
  // so every article links sideways instead of only upward.
  const tree = await getDirectoryTree();
  const siblings = dirPath
    ? tree.directories[dirPath]?.articles || []
    : tree.articles || [];
  const related = siblings
    .filter((fileName) => fileName !== artName)
    .slice(0, 6)
    .map((fileName) => ({
      name: cleanTitle(fileName),
      href: articlePath(dirPath, fileName),
    }));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400 mb-6" aria-label="面包屑导航">
        <ol className="flex items-center gap-2 flex-wrap">
          {breadcrumbItems.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2">
              {idx > 0 && <span aria-hidden="true">/</span>}
              {idx < breadcrumbItems.length - 1 && item.url ? (
                <Link
                  href={item.url}
                  className="hover:text-blue-600 transition-colors"
                  prefetch={false}
                >
                  {item.name}
                </Link>
              ) : (
                <span className="text-gray-600 truncate max-w-xs" title={item.name}>
                  {item.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Article */}
      <article>
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            {article.title}
          </h1>
          <p className="text-gray-500">
            {section ? `${section} · ` : ''}
            {countWords(article.plainText)} 字
          </p>
        </header>

        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: article.htmlContent }}
        />

        {/* Sibling notes: sideways internal links */}
        {related.length > 0 && (
          <nav className="mt-12 pt-6 border-t border-gray-200" aria-label="相关文章">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">相关文章</h2>
            <ul className="space-y-2">
              {related.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                    prefetch={false}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Prev/next within the same category keeps crawl depth low */}
        {segments.length > 0 && (
          <nav className="mt-8 pt-6 border-t border-gray-200" aria-label="分类导航">
            {dirPath ? (
              <Link
                href={categoryPath(dirPath)}
                className="text-blue-600 hover:text-blue-800 text-sm"
                prefetch={false}
              >
                ← 返回 {categoryTitle(dirPath)}
              </Link>
            ) : (
              <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
                ← 返回首页
              </Link>
            )}
          </nav>
        )}
      </article>

      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </div>
  );
}
