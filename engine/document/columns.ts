import { Node } from '@tiptap/core';
import { parseDirective, parseBlocks, stringifyBlocks, validate, directiveStart, serializeContainer } from '../fotionmark';

const width = (value: unknown) => typeof value === 'string' && /^\d{1,3}(?:\.\d+)?%$/.test(value) && parseFloat(value) > 0 && parseFloat(value) < 100 ? value : null;

/** One column of a `columns` block; only valid inside it. */
export const Column = Node.create({
  name: 'column', content: 'block+', isolating: true, defining: true,
  addAttributes: () => ({ width: { default: null, rendered: false, parseHTML: element => width(element.getAttribute('data-width')) } }),
  parseHTML: () => [{ tag: 'div[data-fotion-column]' }],
  renderHTML: ({ node }) => ['div', { 'data-fotion-column': '', class: 'fotion-column', ...(node.attrs.width ? { 'data-width': node.attrs.width, style: `flex: 0 0 ${node.attrs.width}` } : {}) }, 0],
});

/**
 * Notion columns, stored as FotionMark:
 *   ::::columns
 *   :::column{width=60%}
 *   …
 *   :::
 *   ::::
 * The block reads its own columns, so a stray `:::column` elsewhere stays an unknown, preserved block.
 */
export const Columns = Node.create({
  name: 'columns', group: 'block', content: 'column column+', isolating: true,
  parseHTML: () => [{ tag: 'div[data-fotion-columns]' }],
  renderHTML: () => ['div', { 'data-fotion-columns': '', class: 'fotion-columns' }, 0],
  markdownTokenizer: {
    name: 'columns', level: 'block', start: directiveStart,
    tokenize(source, _tokens, lexer) {
      // The FotionMark interpreter decides; invalid blocks are left to the preserved directive block.
      const directive = parseDirective(source);
      if (directive?.kind !== 'container' || directive.name !== 'columns') return;
      const [node] = parseBlocks(directive.raw);
      if (node?.type !== 'block' || validate([node]).length) return;
      const columns = node.children.map(column => column.type === 'block' ? { width: width(column.attributes.width), tokens: lexer.blockTokens(stringifyBlocks(column.children)) } : null);
      return { type: 'columns', raw: directive.raw, columns };
    },
  },
  parseMarkdown(token, helpers) {
    return helpers.createNode('columns', undefined, (token.columns as { width: string | null; tokens: never[] }[]).map(column => {
      const body = helpers.parseChildren(column.tokens);
      return helpers.createNode('column', { width: column.width }, body.length ? body : [{ type: 'paragraph' }]);
    }));
  },
  renderMarkdown(node, helpers) {
    const columns = (node.content || []).map(column => serializeContainer('column', column.attrs?.width ? { width: column.attrs.width } : {}, helpers.renderChildren(column.content || [], '\n\n')));
    return serializeContainer('columns', {}, columns.join('\n'));
  },
});
