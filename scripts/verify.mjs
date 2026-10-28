/**
 * Full functional verification for the knowledge-base site.
 *
 *   node scripts/verify.mjs                     # data + render checks only
 *   VERIFY_BASE_URL=http://127.0.0.1:3210 node scripts/verify.mjs
 *                                               # adds live HTTP probes
 *
 * Run from the project root. Exits 1 on any failure.
 */

import {
  getDirectoryTree,
  getArticleContent,
  getRawBaseForDir,
  getRepoRawBase,
} from '../lib/gitee.js';
import {
  renderMarkdown,
  extractPlainText,
  prepareArticle,
  countWords,
} from '../lib/markdown.js';
import {
  generatePageMetadata,
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateItemListSchema,
  generateSiteSchema,
  SITE_CONFIG,
} from '../lib/seo.js';
import {
  TEXT_FILE_RE,
  isTextFile,
  isAssetFile,
  cleanTitle,
  stripExtension,
  splitSegments,
  encodeSegments,
  articleSegments,
  articlePath,
  categoryPath,
  absoluteUrl,
  parseArticleSlug,
  parseCategorySlug,
  categoryTitle,
  decodeMaybe,
  resolveRelativeArticleLink,
} from '../lib/urls.js';
import { isExcluded } from '../lib/excluded.js';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── Harness ────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function ok(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`);
    passed += 1;
  } else {
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
    failures.push(label);
    failed += 1;
  }
}

function section(title) {
  console.log(`\n${'='.repeat(70)}\n  ${title}\n${'='.repeat(70)}`);
}

const H1_RE = /<h1[\s>]/g;
function countH1(html) {
  return (html.match(H1_RE) || []).length;
}

// ── 1. Directory tree ──────────────────────────────────
section('1. getDirectoryTree() — 目录树完整性');

const tree = await getDirectoryTree();
ok('返回对象', !!tree && typeof tree === 'object');
ok('articles 是数组', Array.isArray(tree.articles));
ok('directories 是对象', !!tree.directories && typeof tree.directories === 'object');
ok('assets 是数组（图片索引）', Array.isArray(tree.assets));
ok('assets 至少收录一张图片', (tree.assets || []).length > 0, `${(tree.assets || []).length} 个`);
const repoRawBase = await getRepoRawBase();

const dirKeys = Object.keys(tree.directories || {});
const dirEntries = dirKeys.map((key) => ({
  key,
  articles: (tree.directories[key].articles || []).slice(),
}));

const allArticles = [
  ...tree.articles.map((name) => ({ dirPath: '', fileName: name })),
  ...dirEntries.flatMap(({ key, articles }) =>
    articles.map((name) => ({ dirPath: key, fileName: name }))
  ),
];

ok('文章总数 > 0', allArticles.length > 0, `${allArticles.length} 篇 / ${dirKeys.length} 个分类`);

const nonText = allArticles.filter((a) => !isTextFile(a.fileName));
ok('全部为文本文章（无 pdf/docx/图片）', nonText.length === 0, nonText.map((a) => a.fileName).join(', ') || 'ok');

const assets = allArticles.filter((a) => isAssetFile(a.fileName));
ok('无图片混入文章列表', assets.length === 0);

const excludedListed = allArticles.filter((a) =>
  isExcluded(`${a.dirPath ? `${a.dirPath}/` : ''}${a.fileName}`)
);
ok(
  '无被排除的路径（451 / 非内容页）',
  excludedListed.length === 0,
  excludedListed.map((a) => a.fileName).join(', ') || 'ok'
);

const licenseLeak = allArticles.filter((a) => /^LICEN[CS]E/i.test(a.fileName));
ok('无 LICENSE 文件', licenseLeak.length === 0);

const hiddenLeak = allArticles.filter((a) => a.fileName.startsWith('.') || a.dirPath.startsWith('.'));
ok('无隐藏文件', hiddenLeak.length === 0);

// Nested directories must be addressable on their own: every ancestor of a
// dir key has to exist as a category, otherwise the breadcrumb links die.
const missingAncestors = [];
for (const key of dirKeys) {
  const parts = splitSegments(key);
  for (let i = 1; i < parts.length; i += 1) {
    const ancestor = parts.slice(0, i).join('/');
    if (!dirKeys.includes(ancestor)) missingAncestors.push(`${key} → 缺少分类 ${ancestor}`);
  }
}
ok('所有父级目录均可作为分类访问', missingAncestors.length === 0, missingAncestors.join('; ') || 'ok');

const emptyDirs = dirEntries.filter((d) => d.articles.length === 0);
ok('无空分类', emptyDirs.length === 0, emptyDirs.map((d) => d.key).join(', ') || 'ok');

const duplicates = allArticles
  .map((a) => `${a.dirPath}/${a.fileName}`)
  .filter((key, i, arr) => arr.indexOf(key) !== i);
ok('无重复条目', duplicates.length === 0, duplicates.join(', ') || 'ok');

// ── 2. URL helpers ─────────────────────────────────────
section('2. lib/urls.js — 链接构造与反解');

ok('stripExtension 去扩展名', stripExtension('RDMA概论.md') === 'RDMA概论');
ok('cleanTitle 去下划线', cleanTitle('环境构建_代码编译.md') === '环境构建 代码编译', cleanTitle('环境构建_代码编译.md'));
ok('cleanTitle 保留扩展名外的点', cleanTitle('E88.金融离职潮元年.md') === 'E88.金融离职潮元年');
ok('isTextFile 接受 .md', isTextFile('a.md'));
ok('isTextFile 拒绝 .pdf', !isTextFile('a.pdf'));
ok('isAssetFile 接受 .png', isAssetFile('a.png'));

const cjkArticle = articlePath('RDMA/毕设', '环境构建与代码编译.md');
ok(
  'articlePath 逐段编码',
  cjkArticle === '/article/RDMA/%E6%AF%95%E8%AE%BE/%E7%8E%AF%E5%A2%83%E6%9E%84%E5%BB%BA%E4%B8%8E%E4%BB%A3%E7%A0%81%E7%BC%96%E8%AF%91',
  cjkArticle
);
ok('articlePath 保留大小写', articlePath('RDMA', 'RDMA概论.md').includes('RDMA/RDMA'));
ok('categoryPath 逐段编码', categoryPath('RDMA/毕设') === '/category/RDMA/%E6%AF%95%E8%AE%BE');
ok('encodeSegments 不编码斜杠', encodeSegments(['a', 'b']) === 'a/b');

// Round-trip: route → params → route must be stable.
const rt = parseArticleSlug(['RDMA', '毕设', '环境构建与代码编译']);
ok('parseArticleSlug 拆分目录与文件名', rt.dirPath === 'RDMA/毕设' && rt.artName === '环境构建与代码编译');
ok('parseArticleSlug 反解已编码参数', parseArticleSlug(['RDMA', '%E7%90%86%E8%AE%BA']).artName === '理论');
ok('articlePath(parse(x)) 恒定', articlePath(rt.dirPath, rt.artName) === cjkArticle);
ok('parseCategorySlug 反解', parseCategorySlug(['RDMA', '毕设']).dirPath === 'RDMA/毕设');
ok('categoryTitle 可读', categoryTitle('RDMA/毕设') === 'RDMA / 毕设');
ok('decodeMaybe 坏编码原样返回', decodeMaybe('100%') === '100%');
ok('absoluteUrl 拼接', absoluteUrl('https://x.test', '/a') === 'https://x.test/a');
ok('absoluteUrl 空路径返回站点', absoluteUrl('https://x.test', '') === 'https://x.test');

// Relative Markdown links inside notes.
ok(
  '相对 .md 链接改写为文章路由',
  resolveRelativeArticleLink('RDMA/毕设', '../理论.md') === articlePath('RDMA', '理论.md'),
  resolveRelativeArticleLink('RDMA/毕设', '../理论.md')
);
ok(
  '同级相对链接改写',
  resolveRelativeArticleLink('serv00', './部署.md') === articlePath('serv00', '部署.md')
);
ok('外链不改写', resolveRelativeArticleLink('serv00', 'https://example.com/a.md') === null);
ok('站内绝对路径不改写', resolveRelativeArticleLink('serv00', '/article/x') === null);
ok('锚点不改写', resolveRelativeArticleLink('serv00', '#section') === null);
ok('非文本资源不改写', resolveRelativeArticleLink('serv00', './img.png') === null);
ok(
  '链接锚点保留',
  resolveRelativeArticleLink('a', 'b.md#小节') === `${articlePath('a', 'b.md')}#小节`
);

// ── 3. Markdown pipeline ───────────────────────────────
section('3. lib/markdown.js — 渲染管线');

const h1Doc = '# 标题\n\n正文\n\n# 章节一\n\n内容\n\n# 章节二\n\n内容\n';
const prepared = prepareArticle(h1Doc);
ok('prepareArticle 提取首行 H1 作为标题', prepared.title === '标题', String(prepared.title));
const h1Html = renderMarkdown(prepared.markdown);
ok('剩余 H1 全部降级（页面只留一个 h1）', countH1(h1Html) === 0, `h1=${countH1(h1Html)}`);
ok('降级为 h2', (h1Html.match(/<h2[\s>]/g) || []).length === 2);

const fenceDoc = '# 标题\n\n```bash\n# 这是注释不是标题\necho hi\n```\n';
const fencePrepared = prepareArticle(fenceDoc);
const fenceHtml = renderMarkdown(fencePrepared.markdown);
ok('代码块内的 # 不被当作标题', !fenceHtml.includes('<h1') && fenceHtml.includes('这是注释不是标题'));

const plainDoc = '## 小节\n\n内容\n';
const plainPrepared = prepareArticle(plainDoc);
ok('无 H1 文档不降级', renderMarkdown(plainPrepared.markdown).includes('<h2'));

const imgHtml = renderMarkdown('![图](./pic/a.png)', { rawBase: 'https://cdn.test/raw/dir' });
ok(
  '相对图片改为绝对地址（含 ./ 归一化）',
  imgHtml.includes('src="https://cdn.test/raw/dir/pic/a.png"'),
  imgHtml.match(/src="[^"]*"/)?.[0]
);
ok('父级相对图片归一化', renderMarkdown('![x](../b.png)', { rawBase: 'https://r.test/d' }).includes('src="https://r.test/b.png"'), renderMarkdown('![x](../b.png)', { rawBase: 'https://r.test/d' }).match(/src="[^"]*"/)?.[0]);
ok('图片懒加载', imgHtml.includes('loading="lazy"'));
ok('图片 async 解码', imgHtml.includes('decoding="async"'));
// Git hosts 403 a cross-origin hotlink (same URL is 200 with no Referer), so a
// cross-origin <img> without this attribute is a guaranteed broken icon.
ok('图片带 no-referrer（规避防盗链）', /referrerpolicy="no-referrer"/.test(imgHtml));
ok('图片保留 alt', /alt="图"/.test(imgHtml));

// Obsidian wiki embeds — invisible before, because markdown-it does not parse
// `![[...]]` and rendered the brackets as text.
const wikiCtx = {
  dirPath: 'RDMA',
  assets: ['RDMA/Pasted image 20241015143448.png', '快应用/image.png'],
  repoRawBase: 'https://raw.test/raw/main',
};
const wikiHtml = renderMarkdown('![[Pasted image 20241015143448.png]]', wikiCtx);
ok(
  'Obsidian ![[...]] 同目录图片被解析',
  wikiHtml.includes('src="https://raw.test/raw/main/RDMA/Pasted%20image%2020241015143448.png"'),
  wikiHtml.match(/src="[^"]*"/)?.[0]
);
ok('wiki 嵌入不再显示原始方括号', !wikiHtml.includes('![['));
const wikiRoot = renderMarkdown('![[快应用/image.png]]', wikiCtx);
ok(
  'wiki 仓库根相对路径被解析',
  wikiRoot.includes('src="https://raw.test/raw/main/%E5%BF%AB%E5%BA%94%E7%94%A8/image.png"'),
  wikiRoot.match(/src="[^"]*"/)?.[0]
);
const wikiMissing = renderMarkdown('![[不存在.png]]', wikiCtx);
ok('无法定位的嵌入保持原样（不造 404）', wikiMissing.includes('![[不存在.png]]'));
const wikiFence = renderMarkdown('```\n![[a.png]]\n```', { ...wikiCtx, assets: ['RDMA/a.png'] });
ok('代码块内的嵌入不被改写', wikiFence.includes('![[a.png]]'));

// markdown-it percent-encodes a destination before the renderer sees it, so a
// CJK path arrives as `%e5%bf%ab…`. Matching the inventory against that string
// silently fell through to the old resolver and produced a 404 URL.
const vaultImg = renderMarkdown('![x](快应用/image.png)', wikiCtx);
ok(
  '普通语法里的仓库根相对图片也能定位',
  vaultImg.includes('/raw/main/%E5%BF%AB%E5%BA%94%E7%94%A8/image.png'),
  vaultImg.match(/src="[^"]*"/)?.[0]
);
// `image.png` exists in more than one folder; the note's own folder must win.
const sameNameCtx = {
  dirPath: 'RDMA',
  assets: ['RDMA/image.png', '快应用/image.png'],
  repoRawBase: 'https://raw.test/raw/main',
};
const sameName = renderMarkdown('![x](image.png)', sameNameCtx);
ok(
  '同名文件优先取笔记所在目录',
  sameName.includes('/raw/main/RDMA/image.png'),
  sameName.match(/src="[^"]*"/)?.[0]
);
const nonImageEmbed = renderMarkdown('![[陈述.pdf]]', {
  dirPath: '预推免相关',
  assets: ['预推免相关/陈述.pdf'],
  repoRawBase: 'https://raw.test/raw/main',
});
ok(
  '非图片嵌入转为下载链接',
  nonImageEmbed.includes('href="https://raw.test/raw/main/') && !nonImageEmbed.includes('![['),
  nonImageEmbed.match(/<a[^>]*>/)?.[0]
);

const noAlt = renderMarkdown('![](./a.png)', { rawBase: 'https://cdn.test/r' });
ok('空 alt 有兜底文本', /alt="[^"]+"/.test(noAlt), noAlt.match(/alt="[^"]*"/)?.[0]);

const pasteAlt = renderMarkdown('![Pasted image 20241209104124](./a.png)', { rawBase: 'https://cdn.test/r' });
ok('Obsidian 粘贴图名替换为可读 alt', !/Pasted image/.test(pasteAlt), pasteAlt.match(/alt="[^"]*"/)?.[0]);

const extLink = renderMarkdown('[外链](https://example.com)', {});
ok('外链新窗口打开', extLink.includes('target="_blank"') && extLink.includes('rel="noopener noreferrer"'));

const relLink = renderMarkdown('[内部](../a.md)', {
  resolveLink: (href) => resolveRelativeArticleLink('x/y', href) ?? href,
});
ok('Markdown 相对链接被改写', relLink.includes(articlePath('x', 'a.md')), relLink.match(/href="[^"]*"/)?.[0]);

ok('extractPlainText 分词不粘连', extractPlainText('<h1>Title</h1><p>Hello</p><p>World</p>', 100).startsWith('Title Hello World'));
ok('extractPlainText 截断', extractPlainText('<p>' + 'x'.repeat(300) + '</p>', 20).endsWith('...'));
ok('countWords 统计中英混排', countWords('你好 world') === 3, String(countWords('你好 world')));

// ── 4. SEO helpers ─────────────────────────────────────
section('4. lib/seo.js — 元数据与结构化数据');

const metaHome = generatePageMetadata({ description: 'd', path: '/' });
ok('首页标题不重复站点名', (metaHome.title.match(/ - Zihan Home/g) || []).length === 0, metaHome.title);
ok('首页 canonical 为绝对地址', metaHome.alternates.canonical === SITE_CONFIG.url || metaHome.alternates.canonical.startsWith(SITE_CONFIG.url));

const metaArticle = generatePageMetadata({ title: '某文章', description: 'desc', path: '/article/a', type: 'article' });
ok('文章标题只带一次站点名', (metaArticle.title.match(/Zihan Home/g) || []).length === 1, metaArticle.title);
ok(
  'og:image 指向 OG 资源',
  metaArticle.openGraph.images[0].url === absoluteUrl(SITE_CONFIG.url, SITE_CONFIG.ogImage),
  metaArticle.openGraph.images[0].url
);
ok('twitter 大图卡片', metaArticle.twitter.card === 'summary_large_image');
ok('robots 允许大图预览', metaArticle.robots['max-image-preview'] === 'large');

const articleSchema = generateArticleSchema({
  title: '某文章',
  description: 'desc',
  path: '/article/a',
  wordCount: 123,
});
ok('Article schema 类型', articleSchema['@type'] === 'Article');
ok('Article schema 有 headline', articleSchema.headline === '某文章');
ok('Article schema 图片为绝对地址', articleSchema.image[0].startsWith(SITE_CONFIG.url));
ok('Article schema 发布者为 Organization', articleSchema.publisher['@type'] === 'Organization');
ok('Article schema 带字数', articleSchema.wordCount === 123);
ok('Article schema 无编造日期', !('datePublished' in articleSchema) && !('dateModified' in articleSchema));

const crumb = generateBreadcrumbSchema([
  { name: '首页', url: '/' },
  { name: 'RDMA', url: '/category/RDMA' },
  { name: '某文章' },
]);
ok('BreadcrumbList 结构', crumb['@type'] === 'BreadcrumbList' && crumb.itemListElement.length === 3);
ok('面包屑最后一项无 url', !('item' in crumb.itemListElement[2]));
ok('面包屑位置从 1 开始', crumb.itemListElement[0].position === 1);

const itemList = generateItemListSchema({
  name: 'n',
  path: '/',
  items: [{ name: 'a', path: '/category/a' }],
});
ok('ItemList 数量正确', itemList.numberOfItems === 1);
ok('ItemList 条目为绝对地址', itemList.itemListElement[0].url.startsWith(SITE_CONFIG.url));

const siteSchema = generateSiteSchema();
ok('WebSite schema 无虚假 SearchAction', !('potentialAction' in siteSchema));

// A dead hostname baked into the build is the single worst SEO defect possible:
// every canonical, sitemap entry and OG card points nowhere. The previous
// fallback did exactly that, so guard it explicitly.
ok(
  'canonical 不是已失效的主机名',
  !SITE_CONFIG.url.includes('zihan-home.vercel.app'),
  SITE_CONFIG.url
);
{
  const dead = 'zihan-home.vercel.app';
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.next')) continue;
        walk(full);
      } else if (/\.(js|mjs|json|txt|xml)$/.test(entry.name)) {
        if (readFileSync(full, 'utf8').includes(dead)) offenders.push(full.replace(ROOT, ''));
      }
    }
  };
  walk(join(ROOT, 'lib'));
  walk(join(ROOT, 'app'));
  walk(join(ROOT, 'public'));
  ok('源码与静态资源无死域名残留', offenders.length === 0, offenders.join(', ') || '0 处');
}

// Sharing metadata is worthless if the file it points at is missing.
ok(
  'OG 图片文件存在',
  existsSync(join(ROOT, 'public', SITE_CONFIG.ogImage)),
  SITE_CONFIG.ogImage
);

// ── 5. Route graph — the check that catches dead links ─
section('5. 路由图一致性 — 每个链接都必须是真实路由');

const articleRoutes = new Set(
  allArticles.map(({ dirPath, fileName }) => articlePath(dirPath, fileName))
);
const categoryRoutes = new Set(dirKeys.map((key) => categoryPath(key)));

ok('文章路由数 = 文章数', articleRoutes.size === allArticles.length, `${articleRoutes.size}`);
ok('分类路由数 = 分类数', categoryRoutes.size === dirKeys.length, `${categoryRoutes.size}`);

// Every route must survive encode → decode → encode unchanged.
let unstable = 0;
for (const route of articleRoutes) {
  const segments = route.replace(/^\/article\//, '').split('/').map(decodeMaybe);
  const { dirPath, artName } = parseArticleSlug(segments);
  if (articlePath(dirPath, artName) !== route) unstable += 1;
}
ok('文章路由编码可逆', unstable === 0, `${unstable} 条不稳定`);

// No route may collide with another (silent overwrite in generateStaticParams).
let collisions = 0;
for (const route of articleRoutes) {
  if (route.startsWith('/article//') || route === '/article/') collisions += 1;
}
ok('无空段路由', collisions === 0);

// Expected sitemap set, built the same way the route handler builds it.
// Homepage is the bare origin (no trailing slash), exactly as the route emits it.
const STATIC_ROUTES = ['/about'];
const sitemapExpected = new Set([SITE_CONFIG.url]);
for (const route of STATIC_ROUTES) sitemapExpected.add(absoluteUrl(SITE_CONFIG.url, route));
for (const route of categoryRoutes) sitemapExpected.add(absoluteUrl(SITE_CONFIG.url, route));
for (const route of articleRoutes) sitemapExpected.add(absoluteUrl(SITE_CONFIG.url, route));
ok(
  'sitemap 预期条目数',
  sitemapExpected.size === 1 + STATIC_ROUTES.length + categoryRoutes.size + articleRoutes.size,
  `${sitemapExpected.size} 条`
);

// Directory links rendered on the homepage must exist as categories.
const homeDirLinks = dirKeys.map((k) => categoryPath(k));
ok(
  '首页分类链接均为真实路由',
  homeDirLinks.every((l) => categoryRoutes.has(l)),
  `${homeDirLinks.length} 条`
);

// ── 6. Full render sweep ───────────────────────────────
section('6. 全量渲染 — 标题层级 / 图片 / 链接');

const maxArticles = Number(process.env.VERIFY_MAX_ARTICLES || 40);
const sample = allArticles.slice(0, maxArticles);
console.log(`  渲染 ${sample.length}/${allArticles.length} 篇…`);

let renderFailures = 0;
let multiH1 = 0;
let relativeImg = 0;
let deadInternal = 0;
let noTitle = 0;
let emptyBody = 0;
let unresolvedWiki = 0;
let noRefPolicy = 0;

for (const { dirPath, fileName } of sample) {
  const artName = stripExtension(fileName);
  try {
    const raw = await getArticleContent(dirPath, artName);
    if (!raw) {
      console.log(`  ❌ 拉取失败: ${dirPath}/${fileName}`);
      renderFailures += 1;
      continue;
    }
    const rawBase = await getRawBaseForDir(dirPath);
    const p = prepareArticle(raw);
    const html = renderMarkdown(p.markdown, {
      rawBase,
      dirPath,
      assets: tree.assets || [],
      repoRawBase,
    });

    if (countH1(html) > 0) {
      multiH1 += 1;
      console.log(`  ❌ 仍有 H1: ${dirPath}/${fileName}`);
    }
    // A note whose whole content is one embedded screenshot has no prose at
    // all; that is a legitimately image-only page, not an empty render.
    const textOnly = html.replace(/<[^>]*>/g, '').trim();
    if (textOnly.length < 5 && !/<img\b/i.test(html)) {
      emptyBody += 1;
      console.log(`  ❌ 正文为空: ${dirPath}/${fileName}`);
    }
    if (!p.title && !cleanTitle(fileName)) {
      noTitle += 1;
    }
    // Only image embeds matter here: a left-over `![[x.png]]` means a figure
    // that the note promises is invisible. `![[x.docx]]` targets a file the
    // repository does not contain at all, so it is left as written on purpose.
    const danglingEmbed = [...html.matchAll(/!\[\[([^\][|]+?)(?:\|[^\]]*)?\]\]/g)].find((m) =>
      /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i.test(m[1].trim())
    );
    if (danglingEmbed) {
      unresolvedWiki += 1;
      console.log(`  ❌ 未解析的图片嵌入: ${dirPath}/${fileName} → ${danglingEmbed[0]}`);
    }
    const unguardedImg = [...html.matchAll(/<img[^>]+>/g)].find(
      (m) => /^https?:\/\//i.test(m[0].match(/src="([^"]+)"/)?.[1] || '') && !/referrerpolicy=/.test(m[0])
    );
    if (unguardedImg) {
      noRefPolicy += 1;
      console.log(`  ❌ 跨域图片缺少 no-referrer: ${dirPath}/${fileName}`);
    }
    for (const m of html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
      const src = m[1];
      if (!/^(?:https?:)?\/\//i.test(src) && !src.startsWith('/')) {
        relativeImg += 1;
        console.log(`  ❌ 相对图片地址: ${dirPath}/${fileName} → ${src}`);
        break;
      }
    }
    for (const m of html.matchAll(/<a[^>]+href="(\/article\/[^"]+)"/g)) {
      const href = m[1].split('#')[0];
      if (!articleRoutes.has(href)) {
        deadInternal += 1;
        console.log(`  ❌ 指向不存在的文章: ${dirPath}/${fileName} → ${href}`);
        break;
      }
    }
  } catch (e) {
    console.log(`  ❌ 异常 ${dirPath}/${fileName}: ${e.message}`);
    renderFailures += 1;
  }
}

ok('全部文章可拉取并渲染', renderFailures === 0, `${renderFailures} 失败`);
ok('渲染结果无多余 H1', multiH1 === 0, `${multiH1} 篇`);
ok('图片全部为绝对地址', relativeImg === 0, `${relativeImg} 篇`);
ok('正文均非空', emptyBody === 0, `${emptyBody} 篇`);
ok('内部文章链接均有效', deadInternal === 0, `${deadInternal} 处`);
ok('每篇都有可显示标题', noTitle === 0);
ok('无残留未解析的图片嵌入', unresolvedWiki === 0, `${unresolvedWiki} 篇`);
ok('跨域图片均带 no-referrer', noRefPolicy === 0, `${noRefPolicy} 篇`);

// ── 7. Live HTTP probes (opt-in) ───────────────────────
section('7. 线上路由探测');

const baseUrl = process.env.VERIFY_BASE_URL;
if (!baseUrl) {
  console.log('  跳过：设置 VERIFY_BASE_URL=http://127.0.0.1:3210 启用');
} else {
  const targets = [
    ['/', 'home'],
    ['/about', 'about'],
    ['/sitemap.xml', 'sitemap'],
    ['/robots.txt', 'robots'],
    [SITE_CONFIG.ogImage, 'og image'],
    ['/hero-banner.png', 'hero banner'],
    ...dirKeys.slice(0, 6).map((k) => [categoryPath(k), `category ${k}`]),
    ...sample.slice(0, 6).map(({ dirPath, fileName }) => [
      articlePath(dirPath, fileName),
      `article ${dirPath}/${fileName}`,
    ]),
  ];

  for (const [path, label] of targets) {
    try {
      const res = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(45000) });
      ok(`HTTP ${res.status} ${label}`, res.status === 200, path);
    } catch (e) {
      ok(`HTTP 请求 ${label}`, false, `${path} — ${e.message}`);
    }
  }

  try {
    const res = await fetch(`${baseUrl}/__definitely_missing__`, { signal: AbortSignal.timeout(20000) });
    ok('不存在的路径返回 404', res.status === 404, String(res.status));
  } catch (e) {
    ok('不存在的路径返回 404', false, e.message);
  }

  // Internal linking: an article must point sideways at its siblings, otherwise
  // every note is a dead end that only the sitemap knows about.
  try {
    const rich = dirKeys
      .map((k) => [k, (tree.directories[k]?.articles || []).length])
      .sort((a, b) => b[1] - a[1])[0];
    if (rich && rich[1] > 1) {
      const dirPath = rich[0];
      const fileName = tree.directories[dirPath].articles[0];
      const html = await (
        await fetch(`${baseUrl}${articlePath(dirPath, fileName)}`, { signal: AbortSignal.timeout(45000) })
      ).text();
      const links = [
        ...html.matchAll(/<a[^>]+href="(\/article\/[^"]+)"/g),
      ].map((m) => m[1]);
      ok('文章页含同分类内链', html.includes('相关文章') && links.length > 0, `${links.length} 条`);
      ok(
        '内链指向真实文章',
        links.every((l) => articleRoutes.has(l) || articleRoutes.has(decodeMaybe(l))),
        `${links.length} 条`
      );
    } else {
      ok('文章页含同分类内链', false, '没有含多篇文章的目录可测');
    }
  } catch (e) {
    ok('文章页含同分类内链', false, e.message);
  }

  // The hero must be a real optimised image, not a broken <img>.
  try {
    const html = await (await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(30000) })).text();
    ok('首页引用顶层横幅', html.includes('hero-banner'), 'hero-banner.png');
  } catch (e) {
    ok('首页引用顶层横幅', false, e.message);
  }

  try {
    const xml = await (await fetch(`${baseUrl}/sitemap.xml`, { signal: AbortSignal.timeout(30000) })).text();
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    ok('sitemap 条目数与数据一致', locs.length === sitemapExpected.size, `${locs.length} vs ${sitemapExpected.size}`);
    ok('sitemap 无重复', new Set(locs).size === locs.length);
    ok('sitemap 全部为绝对地址', locs.every((l) => l.startsWith('https://')));
  } catch (e) {
    ok('sitemap 可解析', false, e.message);
  }
}

// ── Summary ────────────────────────────────────────────
section('结果汇总');
const total = passed + failed;
console.log(`  ${passed}/${total} 通过${failed > 0 ? `，${failed} 失败` : ''}`);
console.log(`  分类 ${dirKeys.length} 个，文章 ${allArticles.length} 篇，sitemap ${sitemapExpected.size} 条`);
if (failed > 0) {
  console.log('  失败项:');
  failures.forEach((f) => console.log(`    · ${f}`));
}

process.exit(failed > 0 ? 1 : 0);
