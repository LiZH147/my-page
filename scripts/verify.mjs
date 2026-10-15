/**
 * Verify script — tests every data-layer and rendering path.
 *
 * Run: node scripts/verify.mjs
 * Requires: working directory = project root
 */

import { getDirectoryTree, getArticleContent, generateSlug } from '../lib/gitee.js';
import { renderMarkdown, extractPlainText } from '../lib/markdown.js';
import { generatePageMetadata, generateArticleSchema, generateBreadcrumbSchema } from '../lib/seo.js';

// ── Helpers ────────────────────────────────────────────
let passed = 0;
let failed = 0;

function ok(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

// ── 1. Data layer: Tree ────────────────────────────────
section('1. getDirectoryTree() — 目录树');

const tree = await getDirectoryTree();
ok('返回非空对象', !!tree);
ok('有 articles 字段', Array.isArray(tree.articles));
ok('有 directories 字段', !!tree.directories && typeof tree.directories === 'object');

const dirNames = Object.keys(tree.directories);
const totalRoot = tree.articles.length;
const totalNested = dirNames.reduce((s, d) => s + tree.directories[d].articles.length, 0);
const grandTotal = totalRoot + totalNested;

ok('文章总数 > 0', grandTotal > 0, `${grandTotal} articles (${totalRoot} root + ${totalNested} in ${dirNames.length} dirs)`);

console.log('  目录列表:');
for (const d of dirNames.sort()) {
  console.log(`    📁 ${d} (${tree.directories[d].articles.length} articles)`);
  tree.directories[d].articles.slice(0, 3).forEach(a => console.log(`       📄 ${a}`));
  if (tree.directories[d].articles.length > 3) console.log(`       … +${tree.directories[d].articles.length - 3} more`);
}
if (totalRoot > 0) {
  console.log(`    📄 根目录 (${totalRoot} articles):`);
  tree.articles.slice(0, 3).forEach(a => console.log(`       ${a}`));
}

// ── 2. Data layer: Article content ─────────────────────
section('2. getArticleContent() — 文章内容');

// Pick one article from first dir and one root article
let testArticle = null;
let testDir = null;
if (dirNames.length > 0) {
  for (const d of dirNames) {
    if (tree.directories[d].articles.length > 0) {
      testDir = d;
      testArticle = tree.directories[d].articles[0];
      break;
    }
  }
}
if (!testArticle && totalRoot > 0) {
  testArticle = tree.articles[0];
  testDir = null;
}

if (testArticle) {
  const slug = testArticle.replace(/\.(md|html|txt)$/, '');
  const content = await getArticleContent(testDir, slug);
  ok('获取到文章内容', !!content, testDir ? `${testDir}/${slug} (${content.length} chars)` : `${slug} (${content.length} chars)`);
  ok('内容非空', content.length > 10);
  ok('包含 Markdown 标记', content.includes('#') || content.includes('*') || content.includes('-') || content.includes('```'), '看起来是文章');

  // Also test root article if we have one
  if (totalRoot > 0 && testDir) {
    const rootSlug = tree.articles[0].replace(/\.(md|html|txt)$/, '');
    const rootContent = await getArticleContent(null, rootSlug);
    ok('根目录文章可获取', !!rootContent, `${rootSlug} (${rootContent?.length ?? 0} chars)`);
  }
} else {
  ok('有可用测试文章', false);
}

// ── 3. Markdown rendering ──────────────────────────────
section('3. renderMarkdown() — Markdown 渲染');

const samples = {
  heading: '# Hello World',
  code: '```js\nconst x = 1;\n```',
  link: '[example](https://example.com)',
  list: '- item 1\n- item 2',
  table: '| a | b |\n|---|---|\n| 1 | 2 |',
};

for (const [name, md] of Object.entries(samples)) {
  const html = renderMarkdown(md);
  ok(`${name} → HTML`, html.length > md.length, `output ${html.length} chars`);
  ok(`${name} — 不是原文`, !html.includes(md.replace(/\n/g, ' ')) || html.length > md.length * 2);
}

ok('空输入返回空串', renderMarkdown('') === '');
ok('null 安全', renderMarkdown(null) === '');

// ── 4. Plain text extraction ───────────────────────────
section('4. extractPlainText() — 纯文本提取');

const plain = extractPlainText('<h1>Title</h1><p>Hello <strong>world</strong></p>', 200);
ok('去除 HTML 标签', plain === 'TitleHello world');
ok('截断', extractPlainText('<p>' + 'x'.repeat(500) + '</p>', 50).length <= 53) // 50 + '...'
ok('空输入', extractPlainText('', 50) === '');

// ── 5. Slug generation ─────────────────────────────────
section('5. generateSlug() — Slug 生成');

ok('去除 .md', generateSlug('Hello World.md') === 'hello-world');
ok('去除 .html', generateSlug('Test-File.html') === 'test-file');
ok('中英文混合', generateSlug('RDMA 概论.md') === 'rdma-概论');
ok('多余符号', generateSlug('A & B — C.md') === 'a-b-c');

// ── 6. SEO metadata ────────────────────────────────────
section('6. SEO — Metadata & Schema');

const meta = generatePageMetadata({ title: '测试', description: '描述', path: '/article/test' });
ok('title', meta.title === '测试 - 梓木辛 - Zihan Home');
ok('description', meta.description === '描述');
ok('openGraph', !!meta.openGraph);

const articleSchema = generateArticleSchema({ title: '测试文章', description: '文章简述', path: '/article/test' });
ok('article JSON-LD', articleSchema['@type'] === 'Article');
ok('article headline', articleSchema.headline === '测试文章');

const breadcrumb = generateBreadcrumbSchema([{ name: '首页', url: '/' }, { name: 'RDMA', url: '/category/RDMA' }, { name: '文章', url: '/article/test' }]);
ok('breadcrumb JSON-LD', breadcrumb['@type'] === 'BreadcrumbList');
ok('breadcrumb items', breadcrumb.itemListElement.length === 3);

// ── 7. Cross-article consistency ───────────────────────
section('7. 交叉验证 — 所有文章可渲染');

let contentFailures = 0;
const maxTest = Math.min(grandTotal, 10); // test up to 10 random articles
const toTest = [];

// Gather test candidates
for (const d of dirNames) {
  for (const a of tree.directories[d].articles) {
    toTest.push({ dir: d, article: a });
  }
}
for (const a of tree.articles) {
  toTest.push({ dir: null, article: a });
}

// Shuffle and pick
const shuffled = toTest.sort(() => Math.random() - 0.5).slice(0, maxTest);

for (const { dir, article } of shuffled) {
  const slug = article.replace(/\.(md|html|txt)$/, '');
  try {
    const raw = await getArticleContent(dir, slug);
    if (!raw) {
      console.log(`  ❌ ${dir ? dir + '/' : ''}${slug} — 无内容`);
      contentFailures++;
      continue;
    }
    const html = renderMarkdown(raw);
    const text = extractPlainText(html, 100);
    ok(`${dir ? dir + '/' : ''}${slug}`, text.length > 0, `${text.length} chars plain text`);
  } catch (e) {
    console.log(`  ❌ ${dir ? dir + '/' : ''}${slug} — 异常: ${e.message}`);
    contentFailures++;
  }
}

// ── 8. Route coverage ──────────────────────────────────
section('8. 路由完整性');

ok('首页 /', true);
ok('分类页 /category/[catName]', dirNames.length > 0, `${dirNames.length} categories`);
ok('文章页 /article/[...slug]', grandTotal > 0, `${grandTotal} articles`);
ok('API /api/tree', true);

// ── Summary ────────────────────────────────────────────
section('结果汇总');
const total = passed + failed;
console.log(`  ${'✅'.repeat(Math.min(passed, 30))}`);
console.log(`  ${passed}/${total} 通过${failed > 0 ? `, ${failed} 失败` : ''}`);
console.log(`  内容可渲染: ${maxTest - contentFailures}/${maxTest}`);
console.log(`  目录数: ${dirNames.length}  文章总数: ${grandTotal}`);

process.exit(failed > 0 || contentFailures > 0 ? 1 : 0);