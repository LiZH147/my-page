import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import toc from 'markdown-it-toc-done-right';
import hljs from 'highlight.js';

// Absolute / non-relative URL detection: scheme:..., //host, /path, #hash
const ABSOLUTE_SRC_RE = /^(?:[a-z][a-z0-9+.-]*:|[\\/]|#)/i;

function isRelativeSrc(src) {
  return typeof src === 'string' && src !== '' && !ABSOLUTE_SRC_RE.test(src);
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Encode a path segment-by-segment so `/` stays a separator. */
function encodePath(path) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

/**
 * Build a resolver that turns a Markdown file's relative asset reference
 * into an absolute, fetchable URL.
 *
 * Obsidian stores images next to the note (e.g. `Pasted image 2024.png`),
 * which rendered as a page-relative `src` and 404'd. Anchoring them to the
 * repo's raw directory fixes ~100 broken images.
 */
function buildAssetResolver(rawBase) {
  if (!rawBase) return (src) => src;
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
  return (src) => {
    if (!isRelativeSrc(src)) return src;

    // Resolve against the directory URL so `.` and `..` are honoured and the
    // path is percent-encoded exactly once. A raw `../b.png` here used to come
    // out as `<dir>/../b.png`, which the raw host rejects.
    try {
      return new URL(safeDecode(src), base).href;
    } catch {
      return base + encodePath(safeDecode(src));
    }
  };
}

/**
 * Text an author would never write on purpose: Obsidian writes
 * `Pasted image 20241209104124.png` into the alt slot automatically, and a
 * bare number is just as opaque. Both are worse than the file name.
 */
function isJunkAltText(value) {
  const text = String(value || '').trim();
  if (!text) return true;
  if (/^pasted[\s_-]*image/i.test(text)) return true;
  if (/^\d+$/.test(text)) return true;
  return false;
}

/**
 * Fallback alt text when the author left the image alt empty.
 * Search engines and screen readers both need something meaningful.
 */
function fallbackAlt(src) {
  const fileName = safeDecode(String(src).split('/').pop() || '');
  const stem = fileName.replace(/\.[a-z0-9]+$/i, '').trim();
  if (isJunkAltText(stem)) return '配图';
  return stem;
}

/**
 * Readable anchors: markdown-it-anchor's default slugify runs
 * encodeURIComponent, producing ids like `dma%E4%B8%8Erdma`. Keep CJK, drop
 * punctuation, collapse whitespace.
 */
function slugifyHeading(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

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
      } catch {
        /* fall through to escaped output */
      }
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
  },
})
  .use(anchor, {
    permalink: anchor.permalink.ariaHidden({ placement: 'before' }),
    slugify: slugifyHeading,
  })
  .use(toc, {
    slugify: slugifyHeading,
    containerClass: 'table-of-contents',
    listClass: 'toc-list',
    itemClass: 'toc-item',
    linkClass: 'toc-link',
  });

// ── Renderer overrides ────────────────────────────────

// Images: absolute src, lazy loading, meaningful alt
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const resolve = env.resolveAsset || ((src) => src);

  const srcIdx = token.attrIndex('src');
  if (srcIdx >= 0) {
    token.attrs[srcIdx][1] = resolve(token.attrs[srcIdx][1]);
  }

  // markdown-it leaves `alt` empty and expects the renderer to fill it in from
  // the inline children. Omitting that assignment emits `alt=""` for every
  // image, throwing away the author's description.
  const authorAlt = self.renderInlineAsText(token.children || [], options, env).trim();
  token.attrSet(
    'alt',
    isJunkAltText(authorAlt) ? fallbackAlt(token.attrGet('src') || '') : authorAlt
  );

  token.attrSet('loading', 'lazy');
  token.attrSet('decoding', 'async');

  return self.renderToken(tokens, idx, options);
};

// Links: map relative `.md` targets onto real article routes, harden external
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const hrefIdx = token.attrIndex('href');

  if (hrefIdx >= 0) {
    const href = token.attrs[hrefIdx][1];
    if (env.resolveLink) {
      token.attrs[hrefIdx][1] = env.resolveLink(href);
    }
    const resolved = token.attrs[hrefIdx][1];
    if (/^https?:\/\//i.test(resolved)) {
      token.attrSet('target', '_blank');
      token.attrSet('rel', 'noopener noreferrer');
    }
  }

  return self.renderToken(tokens, idx, options);
};

/**
 * Raw HTML blocks bypass the image rule, so `<img src="relative">` written
 * directly in Markdown needs a post-render pass.
 */
function rewriteHtmlImages(html, resolve) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    let out = tag.replace(
      /(\ssrc\s*=\s*)(["'])(.*?)\2/i,
      (_match, prefix, quote, src) => `${prefix}${quote}${resolve(src)}${quote}`
    );
    if (!/\sloading\s*=/i.test(out)) out = out.replace(/^<img/i, '<img loading="lazy"');
    if (!/\sdecoding\s*=/i.test(out)) out = out.replace(/^<img/i, '<img decoding="async"');
    if (!/\salt\s*=\s*["'][^"']+["']/i.test(out)) {
      const srcMatch = out.match(/\ssrc\s*=\s*["'](.*?)["']/i);
      const alt = escapeAttr(fallbackAlt(srcMatch ? srcMatch[1] : ''));
      // Replace an empty alt in place; prepending would emit a second attribute.
      out = /\salt\s*=\s*(["'])\1/i.test(out)
        ? out.replace(/\salt\s*=\s*(["'])\1/i, ` alt="${alt}"`)
        : out.replace(/^<img/i, `<img alt="${alt}"`);
    }
    return out;
  });
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Public API ────────────────────────────────────────

const FRONT_MATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
const ATX_RE = /^(\s{0,3})(#{1,6})(\s+.*)$/;

function cleanHeadingText(raw) {
  return raw.replace(/\[\[(.*?)\]\]/g, '$1').trim();
}

/** Shift every ATX heading outside fenced code down by one level. */
function demoteHeadings(lines) {
  let inFence = false;
  let fenceMarker = '';

  return lines.map((line) => {
    const fence = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1][0];
      } else if (fence[1][0] === fenceMarker) {
        inFence = false;
        fenceMarker = '';
      }
      return line;
    }
    if (inFence) return line;

    const match = line.match(ATX_RE);
    if (!match) return line;
    const level = Math.min(match[2].length + 1, 6);
    return `${match[1]}${'#'.repeat(level)}${match[3]}`;
  });
}

/**
 * Normalise an Obsidian note for the web.
 *
 * Obsidian authors routinely use `#` for every section rather than only for the
 * document title — one real note rendered fourteen `<h1>` elements, which
 * flattens the outline for search engines and assistive tech.
 *
 * Rules:
 *  - a leading `# Title` becomes the page title and is removed from the body;
 *  - if any other H1 survives, every heading is demoted one level so the page
 *    keeps exactly one H1 while preserving the author's relative nesting;
 *  - code fences are left untouched.
 *
 * @returns {{ markdown: string, title: string|null }}
 */
export function prepareArticle(content) {
  if (!content) return { markdown: '', title: null };

  const frontMatterMatch = content.match(FRONT_MATTER_RE);
  const frontMatter = frontMatterMatch ? frontMatterMatch[0] : '';
  const body = content.slice(frontMatter.length);
  const lines = body.split(/\r?\n/);

  let title = null;
  let inFence = false;
  let fenceMarker = '';
  let firstContentIndex = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fence = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1][0];
      } else if (fence[1][0] === fenceMarker) {
        inFence = false;
        fenceMarker = '';
      }
    }
    if (line.trim() !== '' && firstContentIndex === -1) firstContentIndex = i;
    if (!inFence && lines[i].trim() !== '') break;
  }

  if (firstContentIndex !== -1) {
    const match = lines[firstContentIndex].match(ATX_RE);
    if (match && match[2].length === 1) {
      title = cleanHeadingText(match[3]) || null;
      lines[firstContentIndex] = '';
    }
  }

  // Any H1 left in the body would compete with the page heading.
  let hasRemainingH1 = false;
  inFence = false;
  fenceMarker = '';
  for (const line of lines) {
    const fence = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1][0];
      } else if (fence[1][0] === fenceMarker) {
        inFence = false;
        fenceMarker = '';
      }
      continue;
    }
    if (inFence) continue;
    const match = line.match(ATX_RE);
    if (match && match[2].length === 1) {
      hasRemainingH1 = true;
      break;
    }
  }

  const normalised = hasRemainingH1 ? demoteHeadings(lines) : lines;

  return {
    markdown: frontMatter + normalised.join('\n').replace(/^\n+/, ''),
    title,
  };
}

/**
 * @param {string} content raw Markdown (already passed through prepareArticle)
 * @param {object} [options]
 * @param {string|null} [options.rawBase] absolute raw dir URL for relative assets
 * @param {(href: string) => string} [options.resolveLink] rewrite relative links
 */
export function renderMarkdown(content, options = {}) {
  if (!content) return '';

  const { rawBase = null, resolveLink = null } = options;

  const env = {
    resolveAsset: buildAssetResolver(rawBase),
    resolveLink,
  };

  const html = md.render(content, env);
  return rewriteHtmlImages(html, env.resolveAsset);
}

export function extractPlainText(html, maxLength = 200) {
  if (!html) return '';
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}

/** Plain-text word/character budget, useful for Article schema. */
export function countWords(text) {
  if (!text) return 0;
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const latin = (text.match(/[A-Za-z0-9_'-]+/g) || []).length;
  return cjk + latin;
}
