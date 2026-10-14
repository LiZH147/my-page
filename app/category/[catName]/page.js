import Link from 'next/link';
import { getDirectoryTree } from '@/lib/gitee';
import { generatePageMetadata } from '@/lib/seo';
import { notFound } from 'next/navigation';

export const revalidate = 3600;

export async function generateStaticParams() {
  const tree = await getDirectoryTree();
  return Object.keys(tree.directories || {}).map((dirName) => ({ catName: dirName }));
}

export async function generateMetadata({ params }) {
  const { catName } = params;
  return generatePageMetadata({
    title: `分类: ${catName}`,
    description: `查看 ${catName} 分类下的所有文章`,
    path: `/category/${catName}`,
  });
}

function extractTitle(name) {
  return name.replace(/\.(md|html|txt)$/, '').replace(/[-_]/g, ' ').trim();
}

export default async function CategoryPage({ params }) {
  const { catName } = params;
  const tree = await getDirectoryTree();

  let dirData = tree.directories?.[catName];
  if (!dirData) {
    const match = Object.keys(tree.directories || {}).find(
      (k) => k.toLowerCase() === catName.toLowerCase()
    );
    if (match) dirData = tree.directories[match];
    if (!dirData) notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="text-sm text-gray-400 mb-6" aria-label="面包屑导航">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-blue-600 transition-colors" prefetch={false}>
              首页
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-600">{catName}</li>
        </ol>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{catName}</h1>
        <p className="text-gray-500 mt-2">共 {dirData.articles?.length || 0} 篇文章</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(dirData.articles || []).map((article) => {
          const title = extractTitle(article);
          const slug = article.replace(/\.(md|html)$/, '');
          const href = `/article/${encodeURIComponent(catName)}/${encodeURIComponent(slug)}`;
          return (
            <Link key={article} href={href} className="article-card group" prefetch={false}>
              <h3 className="group-hover:text-blue-600 transition-colors">{title}</h3>
              <p className="text-sm text-gray-400 mt-1">{article}</p>
            </Link>
          );
        })}
      </div>

      {(!dirData.articles || dirData.articles.length === 0) && (
        <div className="text-center py-16 text-gray-400">
          <p>此分类下暂无文章</p>
        </div>
      )}
    </div>
  );
}