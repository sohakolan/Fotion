import { Node, mergeAttributes } from '@tiptap/core';
import { pageHref, pageIdFromHref } from '../pages/page-links';
import type { Page } from '../models/page';

export const PageMention = Node.create<{ getPage: (id: string) => Pick<Page, 'title' | 'icon' | 'trashed'> | undefined }>({
  name: 'pageMention', group: 'inline', inline: true, atom: true, selectable: true,
  addOptions: () => ({ getPage: () => undefined }),
  addAttributes: () => ({
    id: { default: '', parseHTML: element => pageIdFromHref(element.getAttribute('href') || ''), rendered: false },
    label: { default: '', parseHTML: element => element.getAttribute('data-page-label') || element.textContent || '', rendered: false },
  }),
  parseHTML: () => [{ tag: 'a[data-page-mention]', priority: 1100, getAttrs: element => pageIdFromHref(element.getAttribute('href') || '') ? {} : false }],
  renderHTML({ node, HTMLAttributes }) {
    return ['a', mergeAttributes(HTMLAttributes, { href: pageHref(node.attrs.id), 'data-page-mention': '', 'data-page-label': node.attrs.label, class: 'page-mention' }), node.attrs.label || 'Sans titre'];
  },
  renderText: ({ node }) => node.attrs.label || 'Sans titre',
  markdownTokenizer: {
    name: 'pageMention', level: 'inline', start: src => src.indexOf('['),
    tokenize(src) {
      const match = src.match(/^\[((?:\\.|[^\]\\\n])*)\]\((\.\/[^\s)]+) "fotion:page"\)/);
      if (!match) return;
      const id = pageIdFromHref(match[2]);
      if (!id) return;
      return { type: 'pageMention', raw: match[0], id, label: match[1].replace(/\\(.)/g, '$1') };
    },
  },
  parseMarkdown: (token, helpers) => helpers.createNode('pageMention', { id: token.id, label: token.label }),
  renderMarkdown(node) {
    const page = this.options.getPage(node.attrs?.id);
    const label = (page?.title || node.attrs?.label || 'Sans titre').replace(/\n/g, ' ').replace(/([\\\[\]*_`~<>])/g, '\\$1');
    const href = pageHref(node.attrs?.id || '').replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
    return `[${label}](${href} "fotion:page")`;
  },
});

export function mentionQuery(before: string) {
  const match = before.match(/(?:^|[\s(])(@|\[\[)([^@\[\]\n]{0,100})$/);
  if (!match) return null;
  return { query: match[2], length: match[1].length + match[2].length };
}
