# 梓木辛 (Zihan Home)

基于 Next.js 14 的个人知识库网站，内容来自 Gitee Obsidian 仓库，使用 ISR + SSG 渲染。

## 技术栈

- **框架**: [Next.js 14](https://nextjs.org/) (App Router)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **Markdown**: markdown-it + highlight.js 代码高亮
- **部署**: [Vercel](https://vercel.com)

## 项目结构

```
├── app/                    # Next.js App Router 页面
│   ├── layout.js           # 全局布局（SEO metadata、Header、Footer）
│   ├── page.js             # 首页（SSG）
│   ├── not-found.js        # 404 页面
│   ├── article/[...slug]/  # 文章详情（ISR，含结构化数据）
│   ├── category/[catName]/ # 分类页面（SSG）
│   └── sitemap.xml/        # 动态 Sitemap（SSG）
├── lib/                    # 工具函数
│   ├── gitee.js            # Gitee API 数据获取（含缓存）
│   ├── markdown.js         # Markdown 渲染
│   └── seo.js              # SEO 元数据生成
├── src/
│   └── globals.css         # Tailwind + Markdown 样式
├── public/                 # 静态资源
└── vercel.json             # Vercel 部署配置
```

## SEO 优化清单

- ✅ **SSG / ISR**: 首页和分类页静态生成，文章页 ISR 缓存
- ✅ **TDH**: Title + Description + H1 每页独立优化
- ✅ **Open Graph**: 每页独立 OG 标签
- ✅ **Twitter Card**: Summary card 支持
- ✅ **Canonical URL**: 每页规范链接
- ✅ **JSON-LD 结构化数据**: WebSite、Article、BreadcrumbList
- ✅ **Sitemap.xml**: 自动生成，包含所有页面
- ✅ **robots.txt**: 配置爬虫规则和 Sitemap 位置
- ✅ **语义化 HTML**: 使用 `<article>`, `<nav>`, `<header>`, `<footer>`
- ✅ **面包屑导航**: 含 Schema 标记
- ✅ **响应式设计**: Tailwind 移动端优先
- ✅ **语义化 URL**: `/article/category/name` 而非 hash 路由
- ✅ **代码高亮**: highlight.js 服务端渲染

## 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
# 访问 http://localhost:3000

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## Vercel 部署

项目已配置 `vercel.json`，部署到 Vercel 后自动：

1. 使用 `hkg1` (香港) 区域，优化国内访问
2. ISR 缓存页面自动刷新
3. Sitemap 自动更新

```bash
vercel --prod
```

## 数据源

文章和分类数据来自 Gitee 仓库 `lizihan147/Obsidian-depository`，通过 cheerio 解析 HTML 页面获取。构建时 / 首次请求时获取并缓存。

## License

MIT