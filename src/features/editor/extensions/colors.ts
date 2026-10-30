import { Mark, mergeAttributes } from '@tiptap/core';

export const textColors = [
  { id: 'default', label: 'Par défaut', text: 'inherit', background: 'transparent' },
  { id: 'gray', label: 'Gris', text: '#787774', background: '#f1f1ef' },
  { id: 'brown', label: 'Marron', text: '#9f6b53', background: '#f4eeee' },
  { id: 'orange', label: 'Orange', text: '#d9730d', background: '#fbecdd' },
  { id: 'yellow', label: 'Jaune', text: '#cb912f', background: '#fbf3db' },
  { id: 'green', label: 'Vert', text: '#448361', background: '#edf3ec' },
  { id: 'blue', label: 'Bleu', text: '#337ea9', background: '#e7f3f8' },
  { id: 'purple', label: 'Violet', text: '#9065b0', background: '#f4f0f7' },
  { id: 'pink', label: 'Rose', text: '#c14c8a', background: '#f9eef3' },
  { id: 'red', label: 'Rouge', text: '#d44c47', background: '#fdebec' },
] as const;
export type ColorId = typeof textColors[number]['id'];
export const colorId = (value: unknown): ColorId => textColors.find(c => c.id === value)?.id || 'default';
const palette = (id: unknown) => textColors.find(c => c.id === id) || textColors[0];

export const TextColor = Mark.create({
  name: 'textColor',
  // Keep the HTML wrapper outside code spans so Markdown retains both marks.
  priority: 1100,
  addAttributes() {
    return {
      color: { default: 'default', parseHTML: el => colorId(el.getAttribute('data-fotion-color')), rendered: false },
      background: { default: 'default', parseHTML: el => colorId(el.getAttribute('data-fotion-background')), rendered: false },
    };
  },
  parseHTML: () => [{ tag: 'span[data-fotion-color]' }],
  renderHTML({ mark, HTMLAttributes }) {
    const color = colorId(mark.attrs.color), background = colorId(mark.attrs.background);
    return ['span', mergeAttributes(HTMLAttributes, { 'data-fotion-color': color, 'data-fotion-background': background, style: `color:${palette(color).text};background-color:${palette(background).background}` }), 0];
  },
  renderMarkdown(node, helpers) {
    const color = colorId(node.attrs?.color), background = colorId(node.attrs?.background);
    return `<span data-fotion-color="${color}" data-fotion-background="${background}" style="color:${palette(color).text};background-color:${palette(background).background}">${helpers.renderChildren(node)}</span>`;
  },
  markdownTokenizer: {
    name: 'textColor', level: 'inline', start: src => src.indexOf('<span data-fotion-color='),
    tokenize(src, _tokens, lexer) {
      const opening = src.match(/^<span data-fotion-color="([a-z]+)" data-fotion-background="([a-z]+)"(?: style="[^"]*")?>/);
      if (!opening) return;
      const delimiters = /\\[\s\S]|`+|<\/span>/g;
      delimiters.lastIndex = opening[0].length;
      let match: RegExpExecArray | null;
      while ((match = delimiters.exec(src))) {
        if (match[0].startsWith('`')) {
          const code = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/.exec(src.slice(match.index));
          if (code) delimiters.lastIndex = match.index + code[0].length;
        } else if (match[0] === '</span>') {
          return { type: 'textColor', raw: src.slice(0, delimiters.lastIndex), color: colorId(opening[1]), background: colorId(opening[2]), tokens: lexer.inlineTokens(src.slice(opening[0].length, match.index)) };
        }
      }
    },
  },
  parseMarkdown: (token, helpers) => helpers.applyMark('textColor', helpers.parseInline(token.tokens || []), { color: colorId(token.color), background: colorId(token.background) }),
});
