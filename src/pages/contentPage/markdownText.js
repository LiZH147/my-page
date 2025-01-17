import MarkdownIt from 'markdown-it';
// import emoji from 'markdown-it-emoji';
import sub from 'markdown-it-sub';
import sup from 'markdown-it-sup';
// import footnote from 'markdown-it-footnote';
import deflist from 'markdown-it-deflist';
import abbr from 'markdown-it-abbr';
import anchor from 'markdown-it-anchor';
import toc from 'markdown-it-toc-done-right';
import hljs from 'highlight.js';
// 导入你喜欢的代码高亮主题，这里用 github 主题作为示例
import 'highlight.js/styles/github.css';

export const md = new MarkdownIt({
    html: true,        // 启用 HTML 标签
    xhtmlOut: true,    // 使用 '/' 关闭单标签
    breaks: true,      // 转换段落里的 '\n' 到 <br>
    linkify: true,     // 自动转换 URL 到链接
    typographer: true, // 启用替换规则
    // 启用 HTML 实体解析
    quotes: `""''`,
    // 配置代码高亮
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return '<pre class="hljs"><code>' +
                    hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                    '</code></pre>';
            } catch (__) {}
        }
        // 对代码块内容进行 HTML 实体解码
        str = str.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
        return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
    }
})
// .use(emoji)           // 支持 emoji
.use(sub)            // 支持下标
.use(sup)            // 支持上标
// .use(footnote)       // 支持脚注
.use(deflist)        // 支持定义列表
.use(abbr)           // 支持缩写
.use(anchor)         // 为标题添加锚点
.use(toc);           // 支持目录生成


// 配置 markdown-it 选项
md.set({ 
    html: true,
    // 禁用自动转义
    quotes: `""''`,
    langPrefix: 'language-'
});