import Link from 'next/link';
import Image from 'next/image';
import { getDirectoryTree } from '@/lib/gitee';
import { generatePageMetadata } from '@/lib/seo';

export const metadata = generatePageMetadata({
  title: '首页',
  description: '梓木辛的个人知识库，分享技术文章、学习笔记与知识沉淀。涵盖编程、算法、系统设计等领域。',
});

export const revalidate = 3600;

function extractTitle(name) {
  return name.replace(/\.(md|html|txt)$/, '').replace(/[-_]/g, ' ').trim();
}

function ArticleCard({ article, dirName }) {
  const title = extractTitle(article);
  const slug = article.replace(/\.(md|html)$/, '');
  const href = dirName
    ? `/article/${encodeURIComponent(dirName)}/${encodeURIComponent(slug)}`
    : `/article/${encodeURIComponent(slug)}`;

  return (
    <Link href={href} className="article-card group" prefetch={false}>
      <h3 className="group-hover:text-blue-600 transition-colors">{title}</h3>
      <p className="text-sm text-gray-400 mt-1">
        {dirName ? `${dirName} / ` : ''}{article}
      </p>
    </Link>
  );
}

export default async function HomePage() {
  const tree = await getDirectoryTree();

  const rootArticles = (tree.articles || []).map((a) => ({ article: a, dir: null }));
  const categorized = [];
  for (const [dirName, dirData] of Object.entries(tree.directories || {})) {
    if (dirData.articles) {
      dirData.articles.forEach((article) => categorized.push({ article, dir: dirName }));
    }
  }
  const allArticles = [...categorized, ...rootArticles];
  const dirCount = Object.keys(tree.directories || {}).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <section className="mb-12 text-center">
        <Image
          src="/logo512.png"
          alt="Zihan Home"
          width={80}
          height={80}
          className="mx-auto mb-4 rounded-2xl shadow-lg"
          priority
        />
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          梓木辛的知识库
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          分享技术文章、学习笔记与知识沉淀。涵盖编程、算法、系统设计等领域。
        </p>
      </section>

      {/* Stats */}
      <div className="flex items-center justify-center gap-8 mb-10 text-sm text-gray-500">
        <div className="text-center">
          <span className="block text-2xl font-bold text-gray-900">{allArticles.length}</span>
          <span>篇文章</span>
        </div>
        <div className="text-center">
          <span className="block text-2xl font-bold text-gray-900">{dirCount}</span>
          <span>个分类</span>
        </div>
      </div>

      {/* Categories */}
      {dirCount > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">
            分类目录
          </h2>
          <div className="space-y-8">
            {Object.entries(tree.directories).map(([dirName, dirData]) => (
              <div key={dirName}>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full inline-block" />
                  <Link
                    href={`/category/${encodeURIComponent(dirName)}`}
                    className="hover:text-blue-600 transition-colors"
                    prefetch={false}
                  >
                    {dirName}
                  </Link>
                  <span className="text-sm font-normal text-gray-400">
                    ({dirData.articles?.length || 0} 篇)
                  </span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(dirData.articles || []).slice(0, 6).map((article) => (
                    <ArticleCard key={article} article={article} dirName={dirName} />
                  ))}
                </div>
                {(dirData.articles || []).length > 6 && (
                  <Link
                    href={`/category/${encodeURIComponent(dirName)}`}
                    className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-800"
                    prefetch={false}
                  >
                    查看全部 {(dirData.articles || []).length} 篇 →
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
            {rootArticles.map(({ article }) => (
              <ArticleCard key={article} article={article} />
            ))}
          </div>
        </section>
      )}

      {allArticles.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">暂无内容</p>
          <p className="text-sm mt-2">文章数据将在构建时从 GitHub 加载</p>
        </div>
      )}
    </div>
  );
}