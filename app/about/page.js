import Link from 'next/link';
import { getDirectoryTree } from '@/lib/gitee';
import {
  generatePageMetadata,
  generatePersonSchema,
  generateBreadcrumbSchema,
  SITE_CONFIG,
} from '@/lib/seo';
import { categoryPath, categoryTitle } from '@/lib/urls';

export const revalidate = 3600;

const DESCRIPTION =
  '关于梓木辛的个人知识库：内容范围、组织方式与数据来源。所有文章同步自公开仓库，按主题目录归档，可直接检索与引用。';

export function generateMetadata() {
  return generatePageMetadata({
    title: '关于本站',
    description: DESCRIPTION,
    path: '/about',
  });
}

export default async function AboutPage() {
  let categories = [];
  let articleCount = 0;
  let directoryCount = 0;

  try {
    const tree = await getDirectoryTree();
    articleCount =
      tree.articles.length +
      Object.values(tree.directories).reduce((sum, d) => sum + d.articles.length, 0);
    directoryCount = Object.keys(tree.directories).length;
    categories = Object.entries(tree.directories)
      .map(([dirPath, data]) => ({
        title: categoryTitle(dirPath),
        href: categoryPath(dirPath),
        count: data.articles.length,
      }))
      .sort((a, b) => b.count - a.count);
  } catch {
    // The page must stay reachable even when the upstream repo is unavailable.
  }

  const personSchema = generatePersonSchema();
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: '首页', url: '/' },
    { name: '关于本站', url: '/about' },
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="text-sm text-gray-400 mb-6" aria-label="面包屑导航">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-blue-600 transition-colors" prefetch={false}>
              首页
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-600">关于本站</li>
        </ol>
      </nav>

      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">关于本站</h1>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        <p>
          这是 <strong>{SITE_CONFIG.author}</strong> 的个人知识库，用来沉淀日常学习与工程实践中的笔记。
          内容以第一人称记录，保留当时的判断与踩坑过程，不做二次包装。
        </p>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">内容范围</h2>
          <p>
            目前收录 <strong>{articleCount}</strong> 篇文章，分布在 {directoryCount} 个主题目录下。
            主题按实际写作方向划分，不做人为凑数：
          </p>
          {categories.length > 0 && (
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
                    prefetch={false}
                  >
                    <span className="text-sm text-gray-800">{item.title}</span>
                    <span className="text-xs text-gray-400">{item.count} 篇</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">组织方式</h2>
          <p>
            文章按仓库目录结构原样映射为站点路由：一级目录成为分类页，嵌套目录继续分层，
            文件名即文章地址。这样笔记在仓库里怎么放，在站点上就怎么找，不会有第二套命名。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">数据来源与更新</h2>
          <p>
            文章正文存放在公开的 Gitee 仓库中，本站只做渲染，不额外改写内容。
            阅读全部页面都不需要登录或令牌。站点每小时增量重新验证一次，
            仓库更新后无需手动操作即可生效。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">关于引用</h2>
          <p>
            站内文章均为个人笔记，欢迎引用并注明出处。如发现事实性错误，
            可以直接在对应仓库提交 issue 或 PR 指出，更正会出现在文章正文里。
          </p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-gray-200">
        <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm" prefetch={false}>
          ← 返回首页浏览全部文章
        </Link>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </div>
  );
}
