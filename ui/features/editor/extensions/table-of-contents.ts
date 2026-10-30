import { TableOfContents as EngineTableOfContents } from '../../../../engine';
import type { Transaction } from '@tiptap/pm/state';

export const TableOfContents = EngineTableOfContents.extend({
  addNodeView() {
    return ({ editor }) => {
      const dom = document.createElement('nav');
      dom.className = 'table-of-contents'; dom.contentEditable = 'false';
      dom.setAttribute('aria-label', 'Table des matières'); dom.dataset.fotionToc = '';
      let signature = '';
      const refresh = () => {
        const headings: { pos: number; level: number; title: string }[] = [];
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'heading' || (node.type.name === 'toggleSummary' && node.attrs.level > 0)) headings.push({ pos, level: node.attrs.level, title: node.textContent || 'Titre sans nom' });
        });
        const next = JSON.stringify(headings);
        if (signature === next) return;
        signature = next;
        const focused = dom.contains(document.activeElement) ? [...dom.querySelectorAll('button')].indexOf(document.activeElement as HTMLButtonElement) : -1;
        dom.replaceChildren();
        if (!headings.length) {
          const empty = document.createElement('span');
          empty.className = 'toc-empty'; empty.textContent = 'Ajoutez des titres pour créer une table des matières.';
          dom.append(empty); return;
        }
        const list = document.createElement('ul');
        for (const heading of headings) {
          const item = document.createElement('li');
          const button = document.createElement('button'); button.type = 'button';
          button.textContent = heading.title; button.style.paddingInlineStart = `${8 + (heading.level - 1) * 20}px`;
          // Keeping focus in the editor prevents a quick Enter from re-activating this button.
          button.addEventListener('mousedown', event => event.preventDefault());
          button.addEventListener('click', () => {
            const target = editor.view.nodeDOM(heading.pos);
            if (!(target instanceof HTMLElement)) return;
            for (let parent = target.parentElement; parent; parent = parent.parentElement) if (parent instanceof HTMLDetailsElement) parent.open = true;
            if (editor.isEditable) editor.chain().focus().setTextSelection(heading.pos + 1).run();
            target.scrollIntoView({ block: 'start', behavior: 'auto' });
          });
          item.append(button); list.append(item);
        }
        dom.append(list);
        if (focused >= 0) dom.querySelectorAll('button')[Math.min(focused, headings.length - 1)]?.focus({ preventScroll: true });
      };
      const changed = ({ transaction }: { transaction: Transaction }) => { if (transaction.docChanged) refresh(); };
      editor.on('transaction', changed); refresh();
      return { dom, stopEvent: () => true, ignoreMutation: () => true, destroy: () => editor.off('transaction', changed) };
    };
  },
});
