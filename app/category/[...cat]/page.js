import Link from 'next/link';
import { getDirectoryTree } from '@/lib/gitee';
import {
  generatePageMetadata,
  generateBreadcrumbSchema,
  generateCollectionPageSchema,
  generateItemListSchema,
} from '@/lib/seo';
import {
  articlePath,
  categoryPath,
  categoryTitle,
  cleanTitle,
  parseCategorySlug,
  splitSegments,
} from '@/lib/urls';
import { notFound } from 'next/navigation';

export const revalidate = 3600;

export async function generateStaticParams() {
  const tree = await getDirectoryTree();
  return Object.keys(tree.directories || {}).map((dirPath) => ({
    cat: splitSegments(dirPath),
  }));
}

/** Resolve a directory path case-insensitively against the real tree keys. */
function resolveDirPath(tree, requestedPath) {
  const dirs = Object.keys(tree.directories || {});
  if (dirs.includes(requestedPath)) return requestedPath;

  const lower = requestedPath.toLowerCase();
  return dirs.find((key) => key.toLowerCase() === lower) || null;
}

export async function generateMetadata({ params }) {
  const { dirPath } = parseCategorySlug(params.cat);
  const tree = await getDirectoryTree();
  const resolved = resolveDirPath(tree, dirPath);

  // Same reason as the article route: this runs before streaming starts, so it
  // is the only place that can still answer with a real 404 status.
  if (!resolved) notFound();

  const label = categoryTitle(resolved);
  const count = tree.directories[resolved].articles.length;

  return generatePageMetadata({
    title: `分类: ${label}`,
    description: `${label} 分类下的 ${count} 篇文章，包含技术笔记、学习记录与实践总结。`,
    path: categoryPath(resolved),
  });
}

export default async function CategoryPage({ params }) {
  const { dirPath } = parseCategorySlug(params.cat);
  const tree = await getDirectoryTree();

  const resolved = resolveDirPath(tree, dirPath);
  if (!resolved) notFound();

  const dirData = tree.directories[resolved];
  const label = categoryTitle(resolved);

  const articles = (dirData.articles || []).map((fileName) => ({
    fileName,
    name: cleanTitle(fileName),
    path: articlePath(resolved, fileName),
  }));

  // Immediate child categories (e.g. RDMA → RDMA/毕设)
  const childCategories = Object.keys(tree.directories)
    .filter((key) => key !== resolved && key.startsWith(`${resolved}/`))
    .filter((key) => !key.slice(resolved.length + 1).includes('/'))
    .map((key) => ({
      key,
      name: key.slice(resolved.length + 1),
      count: tree.directories[key].articles.length,
      path: categoryPath(key),
    }));

  const path = categoryPath(resolved);

  // Breadcrumb: 首页 / 每一层目录
  const breadcrumbItems = [{ name: '首页', url: '/' }];
  const segments = splitSegments(resolved);
  for (let i = 0; i < segments.length; i += 1) {
    const partial = segments.slice(0, i + 1).join('/');
    breadcrumbItems.push({ name: segments[i], url: categoryPath(partial) });
  }

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);
  const collectionSchema = generateCollectionPageSchema({
    name: label,
    description: `${label} 分类下的文章列表`,
    path,
    articles,
  });
  const itemListSchema = generateItemListSchema({
    name: `${label} 文章列表`,
    path,
    items: articles,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="text-sm text-gray-400 mb-6" aria-label="面包屑导航">
        <ol className="flex items-center gap-2 flex-wrap">
          {breadcrumbItems.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2">
              {idx > 0 && <span aria-hidden="true">/</span>}
              {idx < breadcrumbItems.length - 1 ? (
                <Link
                  href={item.url}
                  className="hover:text-blue-600 transition-colors"
                  prefetch={false}
                >
                  {item.name}
                </Link>
              ) : (
                <span className="text-gray-600">{item.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{label}</h1>
        <p className="text-gray-500 mt-2">共 {articles.length} 篇文章</p>
      </header>

      {childCategories.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">子分类</h2>
          <div className="flex flex-wrap gap-3">
            {childCategories.map((child) => (
              <Link
                key={child.key}
                href={child.path}
                className="px-4 py-2 rounded-lg bg-gray-50 hover:bg-blue-50 text-sm text-gray-700 hover:text-blue-700 transition-colors"
                prefetch={false}
              >
                {child.name} ({child.count})
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((article) => (
          <Link
            key={article.fileName}
            href={article.path}
            className="article-card group"
            prefetch={false}
          >
            <h3 className="group-hover:text-blue-600 transition-colors">{article.name}</h3>
            <p className="text-sm text-gray-400 mt-1">{article.fileName}</p>
          </Link>
        ))}
      </div>

      {articles.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p>此分类下暂无文章</p>
        </div>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
    </div>
  );
}
