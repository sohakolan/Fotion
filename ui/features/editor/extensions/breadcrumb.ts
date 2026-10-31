import { Breadcrumb as EngineBreadcrumb, pageHref, type Page } from '../../../../engine';
import type { Transaction } from '@tiptap/pm/state';

export type Trail = Pick<Page, 'id' | 'title' | 'icon'>[];

/** Breadcrumb view: every ancestor of the current page, then the page itself, each one opening its page. */
export const Breadcrumb = EngineBreadcrumb.extend<{ getTrail: () => Trail }>({
  addOptions: () => ({ getTrail: () => [] }),
  addNodeView() {
    return ({ editor }) => {
      const dom = document.createElement('nav'); dom.className = 'fm-breadcrumb'; dom.contentEditable = 'false'; dom.setAttribute('aria-label', 'Fil d’Ariane');
      const refresh = () => {
        dom.replaceChildren(...this.options.getTrail().flatMap((page, index) => {
          const link = document.createElement('a'); link.href = pageHref(page.id); link.className = 'breadcrumb-step';
          link.append(Object.assign(document.createElement('span'), { textContent: page.icon || '📄', className: 'breadcrumb-icon' }), page.title || 'Sans titre');
          return index ? [Object.assign(document.createElement('span'), { textContent: '/', className: 'breadcrumb-separator' }), link] : [link];
        }));
      };
      const changed = ({ transaction }: { transaction: Transaction }) => { if (transaction.getMeta('pageMentionsChanged')) refresh(); };
      editor.on('transaction', changed); refresh();
      return { dom, ignoreMutation: () => true, destroy() { editor.off('transaction', changed); } };
    };
  },
});
