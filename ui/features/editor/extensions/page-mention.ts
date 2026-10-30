import { PageMention as EnginePageMention, pageHref } from '../../../../engine';
import type { Transaction } from '@tiptap/pm/state';

export const PageMention = EnginePageMention.extend({
  addNodeView() {
    return ({ node, editor }) => {
      let current = node;
      const dom = document.createElement('a'); dom.className = 'page-mention'; dom.contentEditable = 'false'; dom.tabIndex = 0;
      const icon = document.createElement('span'); icon.className = 'mention-icon'; icon.setAttribute('aria-hidden', 'true');
      const title = document.createElement('span'); dom.append(icon, title);
      const refresh = () => {
        const page = this.options.getPage(current.attrs.id);
        const unavailable = !page || page.trashed;
        const text = page?.title || current.attrs.label || 'Sans titre';
        if (title.textContent !== text) title.textContent = text;
        const emoji = page?.icon || '📄'; if (icon.textContent !== emoji) icon.textContent = emoji;
        dom.href = pageHref(current.attrs.id);
        dom.dataset.pageMention = current.attrs.id;
        dom.classList.toggle('mention-unavailable', unavailable);
        dom.title = unavailable ? `${text} — page indisponible` : `Ouvrir ${text}`;
        dom.setAttribute('aria-label', dom.title);
      };
      const changed = ({ transaction }: { transaction: Transaction }) => { if (transaction.getMeta('pageMentionsChanged')) refresh(); };
      editor.on('transaction', changed); refresh();
      return {
        dom,
        update(updated) { if (updated.type !== current.type) return false; current = updated; refresh(); return true; },
        ignoreMutation: () => true,
        destroy() { editor.off('transaction', changed); },
      };
    };
  },
});
