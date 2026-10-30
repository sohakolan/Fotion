import { LinkToPage as EngineLinkToPage, pageHref, type Page } from '../../../../engine';
import type { Transaction } from '@tiptap/pm/state';

/** Link-to-page view: icon, current title and ↗, kept in sync when pages are renamed. */
export const LinkToPage = EngineLinkToPage.extend<{ getPage: (id: string) => Pick<Page, 'title' | 'icon' | 'trashed'> | undefined }>({
  addOptions: () => ({ getPage: () => undefined }),
  addNodeView() {
    return ({ node, editor }) => {
      let current = node;
      const dom = document.createElement('div'); dom.className = 'fm-link-to-page'; dom.contentEditable = 'false';
      const link = document.createElement('a'); link.className = 'link-to-page';
      const icon = document.createElement('span'); icon.className = 'link-to-page-icon'; icon.setAttribute('aria-hidden', 'true');
      const title = document.createElement('span'); title.className = 'link-to-page-title';
      link.append(icon, title); dom.append(link);
      const refresh = () => {
        const id = current.attrs.attributes?.page || '';
        const page = this.options.getPage(id), unavailable = !page || page.trashed;
        title.textContent = page?.title || 'Page introuvable';
        icon.textContent = page?.icon || '📄';
        link.href = pageHref(id);
        link.classList.toggle('mention-unavailable', unavailable);
        link.title = unavailable ? 'Page indisponible' : `Ouvrir ${title.textContent}`;
      };
      const changed = ({ transaction }: { transaction: Transaction }) => { if (transaction.getMeta('pageMentionsChanged')) refresh(); };
      editor.on('transaction', changed); refresh();
      return { dom, update(updated) { if (updated.type !== current.type) return false; current = updated; refresh(); return true; }, ignoreMutation: () => true, destroy() { editor.off('transaction', changed); } };
    };
  },
});
