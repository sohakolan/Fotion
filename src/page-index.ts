import { Marked, type Token } from 'marked';
import type { Page } from './types';

// Tiptap registers custom tokenizers on the shared marked instance. Keep indexing independent.
const markdown = new Marked({ gfm: true });

export const normalizeSearch = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
export function pageIdFromHref(href: string): string | null {
  try {
    const id = decodeURIComponent(href.split(/[?#]/, 1)[0].replace(/^\.\//, ''));
    return id.endsWith('.md') && !id.startsWith('.') && !/[/\\:\x00-\x1f]/.test(id) && id.length <= 220 ? id : null;
  } catch { return null; }
}
export const pageHref = (id: string) => `./${encodeURIComponent(id)}`;

type Entry = { content: string; text: string; normalized: string; links: Set<string> };
export class PageIndex {
  private entries = new Map<string, Entry>();
  update(pages: Page[]) {
    const ids = new Set(pages.map(page => page.id));
    for (const id of this.entries.keys()) if (!ids.has(id)) this.entries.delete(id);
    for (const page of pages) {
      if (this.entries.get(page.id)?.content === page.content) continue;
      const links = new Set<string>(), parts: string[] = [];
      const visit = (token: Token) => {
        if (token.type === 'link') { const id = pageIdFromHref(token.href); if (id) links.add(id); }
        if (['code', 'codespan', 'image'].includes(token.type) || (token.type === 'text' && !token.tokens?.length)) parts.push('text' in token ? token.text : '');
        if (token.type === 'html') {
          if (/^\s*<details[\s>]/.test(token.text)) markdown.walkTokens(markdown.lexer(token.text.replace(/<\/?(?:details|summary)\b[^>]*>/g, '\n')), visit);
          else parts.push(token.text.replace(/<[^>]*>/g, ' '));
        }
      };
      markdown.walkTokens(markdown.lexer(page.content), visit);
      const text = parts.join(' ').replace(/\s+/g, ' ').normalize('NFC').trim();
      this.entries.set(page.id, { content: page.content, text, normalized: normalizeSearch(text), links });
    }
    return this;
  }
  search(pages: Page[], query: string) {
    const needle = normalizeSearch(query.trim()), terms = needle.split(/\s+/).filter(Boolean);
    return pages.filter(page => !page.trashed).map(page => {
      const title = normalizeSearch(page.title), entry = this.entries.get(page.id);
      const content = entry?.normalized || '';
      if (!terms.every(term => title.includes(term) || content.includes(term))) return null;
      const score = !needle ? 0 : title === needle ? 100 : title.startsWith(needle) ? 80 : title.includes(needle) ? 60 : terms.filter(term => title.includes(term)).length * 10;
      const text = entry?.text || '';
      const match = terms.map(term => content.indexOf(term)).filter(index => index >= 0).sort((a, b) => a - b)[0] ?? 0;
      const start = Math.max(0, match - 45);
      const excerpt = `${start ? '…' : ''}${text.slice(start, start + 160)}${text.length > start + 160 ? '…' : ''}`;
      return { page, score, excerpt };
    }).filter(result => result !== null).sort((a, b) => b.score - a.score || b.page.updated.localeCompare(a.page.updated) || a.page.title.localeCompare(b.page.title));
  }
  backlinks(pages: Page[], id: string) {
    return pages.filter(page => !page.trashed && page.id !== id && this.entries.get(page.id)?.links.has(id));
  }
}
