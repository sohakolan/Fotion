import { Node } from '@tiptap/core';
import { parseDirective, parseBlocks, validate, schema, directiveStart } from '../fotionmark';

/** A FotionMark block this version cannot display: shown as a notice and saved back unchanged. */
export const DirectiveBlock = Node.create({
  name: 'directiveBlock', group: 'block', atom: true, selectable: true,
  addAttributes: () => ({ raw: { default: '', rendered: false, parseHTML: element => element.getAttribute('data-fotion-raw') || '' } }),
  parseHTML: () => [{ tag: 'div[data-fotion-raw]' }],
  renderHTML: ({ node }) => ['div', { 'data-fotion-raw': node.attrs.raw, class: 'fotion-directive', contenteditable: 'false' }, `Bloc « ${parseDirective(node.attrs.raw)?.name || 'inconnu'} » non pris en charge — conservé tel quel`],
  markdownTokenizer: {
    name: 'directiveBlock', level: 'block', start: directiveStart,
    tokenize(source) {
      const directive = parseDirective(source);
      if (!directive) return;
      // Blocks known to the schema and valid get their own editor node; everything else is kept verbatim.
      if (schema[directive.name] && !validate(parseBlocks(directive.raw)).length) return;
      return { type: 'directiveBlock', raw: directive.raw };
    },
  },
  parseMarkdown: (token, helpers) => helpers.createNode('directiveBlock', { raw: token.raw }),
  renderMarkdown: node => node.attrs?.raw || '',
});
