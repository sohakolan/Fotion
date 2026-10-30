import { Node } from '@tiptap/core';

const marker = '<nav data-fotion-toc></nav>';

export const TableOfContents = Node.create({
  name: 'tableOfContents', group: 'block', atom: true, selectable: true,
  parseHTML: () => [{ tag: 'nav[data-fotion-toc]' }],
  renderHTML: () => ['nav', { 'data-fotion-toc': '', 'aria-label': 'Table des matières' }],
  markdownTokenizer: {
    name: 'tableOfContents', level: 'block', start: source => source.indexOf(marker),
    tokenize(source) { if (source.startsWith(marker)) return { type: 'tableOfContents', raw: marker }; },
  },
  parseMarkdown: (_token, helpers) => helpers.createNode('tableOfContents'),
  renderMarkdown: () => marker,
});
