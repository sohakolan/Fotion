import { Node, InputRule } from '@tiptap/core';

/**
 * Notion's block and inline equations, stored in the standard Markdown math syntax that Obsidian and
 * GitHub also render: `$$ … $$` on their own lines for a block, `$…$` inside text.
 * Inline dollars follow Pandoc's rule so prices stay text: no space after the opening `$`, none before
 * the closing one, and no digit right after it.
 */
export const BlockMath = Node.create({
  name: 'blockMath', group: 'block', atom: true, selectable: true,
  addAttributes: () => ({ latex: { default: '', rendered: false, parseHTML: element => element.getAttribute('data-latex') || '' } }),
  parseHTML: () => [{ tag: 'div[data-latex]' }],
  renderHTML: ({ node }) => ['div', { 'data-latex': node.attrs.latex, class: 'math-block' }, node.attrs.latex],
  markdownTokenizer: {
    name: 'blockMath', level: 'block', start: source => source.indexOf('$$'),
    tokenize(source) {
      const match = source.match(/^\$\$[ \t]*\n?([\s\S]*?)\n?[ \t]*\$\$[ \t]*(?:\n|$)/);
      if (!match || !match[1].trim()) return;
      return { type: 'blockMath', raw: match[0], latex: match[1].trim() };
    },
  },
  parseMarkdown: (token, helpers) => helpers.createNode('blockMath', { latex: token.latex }),
  renderMarkdown: node => `$$\n${node.attrs?.latex || ''}\n$$`,
});

export const InlineMath = Node.create({
  name: 'inlineMath', group: 'inline', inline: true, atom: true, selectable: true,
  addAttributes: () => ({ latex: { default: '', rendered: false, parseHTML: element => element.getAttribute('data-latex') || '' } }),
  parseHTML: () => [{ tag: 'span[data-latex]' }],
  renderHTML: ({ node }) => ['span', { 'data-latex': node.attrs.latex, class: 'math-inline' }, node.attrs.latex],
  renderText: ({ node }) => `$${node.attrs.latex}$`,
  markdownTokenizer: {
    name: 'inlineMath', level: 'inline', start: source => source.indexOf('$'),
    tokenize(source) {
      const match = source.match(/^\$(?![\s$])((?:\\\$|[^$\n])+?)(?<!\s)\$(?!\d)/);
      if (!match) return;
      return { type: 'inlineMath', raw: match[0], latex: match[1] };
    },
  },
  parseMarkdown: (token, helpers) => helpers.createNode('inlineMath', { latex: token.latex }),
  renderMarkdown: node => `$${node.attrs?.latex || ''}$`,
  // Notion: typing $$x^2$$ turns into an inline equation.
  addInputRules() {
    return [new InputRule({ find: /\$\$([^$\n]+)\$\$$/, handler: ({ state, range, match }) => {
      state.tr.replaceWith(range.from, range.to, this.type.create({ latex: match[1].trim() }));
    } })];
  },
});
