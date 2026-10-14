import Link from 'next/link';
import { getArticleContent } from '@/lib/gitee';
import { renderMarkdown, extractPlainText } from '@/lib/markdown';
import { generatePageMetadata, generateArticleSchema, generateBreadcrumbSchema } from '@/lib/seo';
import { notFound } from 'next/navigation';

export const revalidate = 3600;

async function fetchArticle(dirName, artName) {
  const rawContent = await getArticleContent(dirName, artName);
  if (!rawContent) return null;

  const htmlContent = renderMarkdown(rawContent);
  const plainText = extractPlainText(htmlContent, 300);

  return { htmlContent, plainText };
}

export async function generateMetadata({ params }) {
  const slug = params.slug || [];
  const dirName = slug.length > 1 ? slug[0] : '';
  const artName = slug.length > 1 ? slug[1] : slug[0];

  if (!artName) return generatePageMetadata({ title: '文章未找到', path: '' });

  const article = await fetchArticle(dirName, artName);
  if (!article) return generatePageMetadata({ title: '文章未找到', path: '' });

  const title = decodeURIComponent(artName).replace(/-/g, ' ');
  const path = `/article/${slug.map(s => encodeURIComponent(s)).join('/')}`;

  return generatePageMetadata({ title, description: article.plainText, path, type: 'article' });
}

export default async function ArticlePage({ params }) {
  const slug = params.slug || [];
  const dirName = slug.length > 1 ? slug[0] : '';
  const artName = slug.length > 1 ? slug[1] : slug[0];

  if (!artName) notFound();

  const article = await fetchArticle(dirName, artName);
  if (!article) notFound();

  const title = decodeURIComponent(artName).replace(/-/g, ' ');
  const path = `/article/${slug.map(s => encodeURIComponent(s)).join('/')}`;

  const articleSchema = generateArticleSchema({ title, description: article.plainText, path });

  const breadcrumbItems = [{ name: '首页', url: '/' }];
  if (dirName) {
    breadcrumbItems.push({
      name: decodeURIComponent(dirName),
      url: `/category/${encodeURIComponent(dirName)}`,
    });
  }
  breadcrumbItems.push({ name: title, url: path });

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400 mb-6" aria-label="面包屑导航">
        <ol className="flex items-center gap-2 flex-wrap">
          {breadcrumbItems.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2">
              {idx > 0 && <span aria-hidden="true">/</span>}
              {item.url ? (
                <Link href={item.url} className="hover:text-blue-600 transition-colors" prefetch={false}>
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
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{title}</h1>
          {article.plainText && (
            <p className="text-gray-500">{article.plainText.slice(0, 160)}</p>
          )}
        </header>

        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: article.htmlContent }}
        />
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