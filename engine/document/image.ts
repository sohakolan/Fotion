import Image from '@tiptap/extension-image';

/** Appearance data attached to an image through a reversible `fotion:image` metadata comment:
 * the plain `![alt](src)` form stays untouched, extra data lives in the comment after the line. */
export type ImageExtras = { width?: number; caption?: string; align?: 'left' | 'center' | 'right' };

const alignValue = (value: unknown): 'left' | 'center' | 'right' | undefined =>
  value === 'left' || value === 'center' || value === 'right' ? value : undefined;

const cleanExtras = (value: unknown): ImageExtras => {
  if (!value || typeof value !== 'object') return {};
  const stored = value as { width?: unknown; caption?: unknown; align?: unknown };
  const width = typeof stored.width === 'number' && Number.isFinite(stored.width) ? Math.min(100, Math.max(15, Math.round(stored.width))) : undefined;
  const caption = typeof stored.caption === 'string' && stored.caption.trim() ? stored.caption.trim() : undefined;
  return { width, caption, align: alignValue(stored.align) };
};

/** Width is the share of the content column and align comes from the reference controls. */
export type ImageAttrs = { src: string; alt: string | null; width: number | null; align: 'left' | 'center' | 'right' };

const imageLine = /^!\[([^\]]*)\]\(([^()\s]+)(?:\s+"([^"]*)")?\)(?: <!-- fotion:image ([^ ]+) -->)?(?=\n|$)/;
const inlineImage = /!\[([^\]]*)\]\(([^()\s]+)(?:\s+"([^"]*)")?\)/;

export function imageExtension() {
  return Image.extend({
    name: 'image',
    content: 'text*',
    addAttributes() {
      return {
        ...this.parent?.(),
        width: {
          default: null,
          rendered: false,
          parseHTML: element => element.hasAttribute('data-fotion-width') ? Math.round(Number(element.getAttribute('data-fotion-width'))) : null,
        },
        align: {
          default: null as 'left' | 'center' | 'right' | null,
          rendered: false,
          parseHTML: element => alignValue(element.getAttribute('data-fotion-align')) ?? null,
        },
      };
    },
    parseHTML() {
      return [{ tag: 'figure[data-fotion-image]' }, { tag: 'img[src]' }];
    },
    renderHTML({ node, HTMLAttributes }) {
      const width = typeof node.attrs.width === 'number' ? node.attrs.width : null;
      const figure: Record<string, unknown> = { 'data-fotion-image': '' };
      if (width) figure['data-fotion-width'] = width;
      if (alignValue(node.attrs.align)) figure['data-fotion-align'] = alignValue(node.attrs.align);
      return ['figure', figure, ['img', { ...HTMLAttributes, 'data-fotion-width': width }], ['figcaption', 0]];
    },
    parseMarkdown(token, helpers) {
      // Tokens from our block tokenizer carry the full payload; inline tokens from phrases split across a line keep the base shape.
      if (token.attrs && typeof token.attrs.src === 'string' && token.attrs.src) {
        const children = Array.isArray(token.tokens) && token.tokens.length > 0 ? [ { type: 'text', text: token.tokens[0].text ?? '' } ] : [];
        return helpers.createNode('image', { ...token.attrs }, children);
      }
      return helpers.createNode('image', { src: token.href, title: token.title, alt: token.text });
    },
    markdownTokenizer: {
      name: 'image',
      level: 'block',
      start: source => source.search(/!\[/),
      tokenize(source, _tokens, _lexer) {
        const match = source.match(imageLine);
        if (!match) return undefined;
        let extras: ImageExtras = {};
        if (match[4]) {
          try { extras = cleanExtras(JSON.parse(decodeURIComponent(match[4]))); } catch { /* keep reading the page. */ }
        }
        // The image line becomes its own block; images inside a longer line stay inline.
        return {
          type: 'image',
          raw: match[0],
          attrs: { src: match[2], alt: match[1] || null, width: extras.width ?? null, align: extras.align ?? null },
          tokens: extras.caption ? [{ type: 'text', raw: extras.caption, text: extras.caption }] : [],
        };
      },
    },
    renderMarkdown(node) {
      const attrs = node.attrs as ImageAttrs;
      const alt = (attrs.alt || '').replace(/([\\[\]])/g, '\\$1');
      const host = node as unknown as { textContent?: string; content?: Array<{ text?: string }> };
      const text = typeof host.textContent === 'string' ? host.textContent : (host.content || []).map(child => child?.text || '').join('');
      const extras: ImageExtras = {};
      if (typeof attrs.width === 'number') extras.width = attrs.width;
      if (text.trim()) extras.caption = text.trim();
      if (attrs.align) extras.align = attrs.align;
      const metadata = extras.width !== undefined || extras.caption || extras.align ? ` <!-- fotion:image ${encodeURIComponent(JSON.stringify(extras))} -->` : '';
      return `![${alt}](${attrs.src})${metadata}`;
    },
  });
}

