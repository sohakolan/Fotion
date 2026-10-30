import { Node } from '@tiptap/core';
import { formatDate, isDateValue } from '../operations/date-query';

/**
 * Notion's date mention (@Aujourd’hui) and reminder, stored as standard HTML readable anywhere:
 *   <time datetime="2026-10-30">30 octobre 2026</time>
 *   <time datetime="2026-10-30T09:00" data-reminder="true">30 octobre 2026 09:00</time>
 */
export const DateMention = Node.create({
  name: 'dateMention', group: 'inline', inline: true, atom: true, selectable: true,
  addAttributes: () => ({
    date: { default: '', rendered: false, parseHTML: element => { const value = element.getAttribute('datetime'); return isDateValue(value) ? value : ''; } },
    reminder: { default: false, rendered: false, parseHTML: element => element.getAttribute('data-reminder') === 'true' },
  }),
  parseHTML: () => [{ tag: 'time[datetime]' }],
  renderHTML: ({ node }) => ['time', { datetime: node.attrs.date, class: 'date-mention', ...(node.attrs.reminder ? { 'data-reminder': 'true' } : {}) }, `@${isDateValue(node.attrs.date) ? formatDate(node.attrs.date) : 'Date invalide'}`],
  renderText: ({ node }) => `@${formatDate(node.attrs.date)}`,
  markdownTokenizer: {
    name: 'dateMention', level: 'inline', start: source => source.indexOf('<time '),
    tokenize(source) {
      const match = source.match(/^<time datetime="([^"]+)"( data-reminder="true")?>[^<]*<\/time>/);
      if (!match || !isDateValue(match[1])) return;
      return { type: 'dateMention', raw: match[0], date: match[1], reminder: !!match[2] };
    },
  },
  parseMarkdown: (token, helpers) => helpers.createNode('dateMention', { date: token.date, reminder: !!token.reminder }),
  renderMarkdown: node => `<time datetime="${node.attrs?.date}"${node.attrs?.reminder ? ' data-reminder="true"' : ''}>${formatDate(node.attrs?.date, new Date(), false)}</time>`,
});
