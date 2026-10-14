import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import toc from 'markdown-it-toc-done-right';
import hljs from 'highlight.js';

const md = new MarkdownIt({
  html: true,
  xhtmlOut: true,
  breaks: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return (
          '<pre class="hljs"><code>' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>'
        );
      } catch (_) {}
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
  },
})
  .use(anchor, {
    permalink: anchor.permalink.ariaHidden({
      placement: 'before',
    }),
  })
  .use(toc, {
    containerClass: 'table-of-contents',
    listClass: 'toc-list',
    itemClass: 'toc-item',
    linkClass: 'toc-link',
  });

export function renderMarkdown(content) {
  if (!content) return '';
  return md.render(content);
}

export function extractPlainText(html, maxLength = 200) {
  if (!html) return '';
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&[^;]+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}