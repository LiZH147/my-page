import Link from 'next/link';
import Image from 'next/image';
import { getDirectoryTree } from '@/lib/gitee';
import {
  generatePageMetadata,
  generateItemListSchema,
  generatePersonSchema,
  SITE_CONFIG,
} from '@/lib/seo';
import {
  articlePath,
  categoryPath,
  categoryTitle,
  cleanTitle,
} from '@/lib/urls';

export const metadata = generatePageMetadata({
  description: SITE_CONFIG.description,
  path: '/',
});

export const revalidate = 3600;

function ArticleCard({ fileName, dirPath }) {
  const href = articlePath(dirPath, fileName);

  return (
    <Link href={href} className="article-card group" prefetch={false}>
      <h3 className="group-hover:text-blue-600 transition-colors">{cleanTitle(fileName)}</h3>
      <p className="text-sm text-gray-400 mt-1">
        {dirPath ? `${categoryTitle(dirPath)} / ` : ''}
        {fileName}
      </p>
    </Link>
  );
}

export default async function HomePage() {
  const tree = await getDirectoryTree();

  const categories = Object.entries(tree.directories || {}).map(([dirPath, dirData]) => ({
    dirPath,
    label: categoryTitle(dirPath),
    articles: dirData.articles || [],
    path: categoryPath(dirPath),
  }));

  const rootArticles = tree.articles || [];
  const articleCount =
    rootArticles.length +
    categories.reduce((sum, category) => sum + category.articles.length, 0);

  const categoryListSchema = generateItemListSchema({
    name: '知识库分类目录',
    path: '/',
    items: categories.map((category) => ({
      name: category.label,
      path: category.path,
    })),
  });
  const personSchema = generatePersonSchema();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero banner — pre-rendered art, text stays in HTML so it is indexable
          and the headline is never baked into a bitmap. */}
      <section className="relative mb-12 -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden rounded-none sm:rounded-xl bg-slate-950">
        <Image
          src="/hero-banner.png"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover object-right"
        />
        <div className="relative px-6 sm:px-10 py-14 sm:py-20 lg:py-24">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 tracking-tight">
            梓木辛的知识库
          </h1>
          <p className="text-sm sm:text-base text-blue-200/80 max-w-2xl leading-relaxed">
            分享技术文章、学习笔记与知识沉淀。涵盖前端工程、系统与网络、科研实践等领域。
          </p>
        </div>
      </section>

      {/* Stats */}
      <div className="flex items-center justify-center gap-8 mb-10 text-sm text-gray-500">
        <div className="text-center">
          <span className="block text-2xl font-bold text-gray-900">{articleCount}</span>
          <span>篇文章</span>
        </div>
        <div className="text-center">
          <span className="block text-2xl font-bold text-gray-900">{categories.length}</span>
          <span>个分类</span>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">
            分类目录
          </h2>
          <div className="space-y-8">
            {categories.map((category) => (
              <div key={category.dirPath}>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full inline-block" />
                  <Link
                    href={category.path}
                    className="hover:text-blue-600 transition-colors"
                    prefetch={false}
                  >
                    {category.label}
                  </Link>
                  <span className="text-sm font-normal text-gray-400">
                    ({category.articles.length} 篇)
                  </span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.articles.slice(0, 6).map((fileName) => (
                    <ArticleCard
                      key={`${category.dirPath}/${fileName}`}
                      fileName={fileName}
                      dirPath={category.dirPath}
                    />
                  ))}
                </div>
                {category.articles.length > 6 && (
                  <Link
                    href={category.path}
                    className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-800"
                    prefetch={false}
                  >
                    查看全部 {category.articles.length} 篇 →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Root articles */}
      {rootArticles.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">
            未分类文章
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rootArticles.map((fileName) => (
              <ArticleCard key={fileName} fileName={fileName} dirPath="" />
            ))}
          </div>
        </section>
      )}

      {articleCount === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">暂无内容</p>
          <p className="text-sm mt-2">内容正在同步，请稍后刷新</p>
        </div>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categoryListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
    </div>
  );
}
