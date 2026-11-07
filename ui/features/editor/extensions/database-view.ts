import { DatabaseView as EngineDatabaseView, FotionMark, type Page } from '../../../../engine';
import type { Transaction } from '@tiptap/pm/state';
import { el, schemaOf, typeIcons, pill, valueEditor, propertyMenu, addPropertyMenu, openPopover, closePopover, store, type DatabaseHost } from '../lib/database-cells';

export type { DatabaseHost } from '../lib/database-cells';
type Property = FotionMark.Property;
const layouts = [['table', 'Tableau', '⊞'], ['board', 'Kanban', '▥']] as const;
const groupable = (property: Property) => property.type === 'select' || property.type === 'status';

/**
 * Notion's database views (table, board). Rows are the pages whose parent is the database; values are their
 * front matter keys. The view holds no data: every change goes through the host, which saves the page files.
 */
export const DatabaseView = EngineDatabaseView.extend<{ host: DatabaseHost }>({
  addOptions: () => ({ host: { pageId: () => '', pages: () => [], update: () => undefined, createRow: async () => undefined, open: () => undefined } }),
  addNodeView() {
    const host = this.options.host;
    return ({ node, editor, getPos }) => {
      let current = node;
      const dom = el('div', 'fm-database-view'); dom.contentEditable = 'false';
      const attributes = () => (current.attrs.attributes ?? {}) as Record<string, string>;
      const settings = () => FotionMark.readAttributes(FotionMark.blocks.get('database-view')!.attributes, attributes());
      const source = () => (settings().src as string | undefined) || host.pageId();
      /** View settings live in the directive: `layout`, `groupBy`. Defaults are never written. */
      const setAttributes = (patch: Record<string, string | undefined>) => {
        const pos = getPos(); if (typeof pos !== 'number' || !editor.isEditable) return;
        const next = { ...attributes(), ...patch };
        for (const [key, value] of Object.entries(next)) if (value === undefined || (key === 'layout' && value === 'table')) delete next[key];
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, attributes: next }));
      };

      function viewMenu(anchor: HTMLElement, database: Page) {
        openPopover(anchor, 'view-menu', box => {
          box.append(el('div', 'popover-heading', 'Disposition'));
          for (const [id, label, icon] of layouts) {
            const button = el('button', 'kit-menu-item'); button.type = 'button';
            button.append(el('span', 'database-type-icon', icon), label);
            if (settings().layout === id) button.append(el('span', 'database-menu-check', '✓'));
            button.addEventListener('click', () => { closePopover(); setAttributes({ layout: id }); });
            box.append(button);
          }
          if (settings().layout !== 'board') return;
          box.append(el('div', 'popover-heading', 'Grouper par'));
          for (const property of schemaOf(database).filter(groupable)) {
            const button = el('button', 'kit-menu-item'); button.type = 'button';
            button.append(el('span', 'database-type-icon', typeIcons[property.type]), property.name);
            if (groupBy(database)?.id === property.id) button.append(el('span', 'database-menu-check', '✓'));
            button.addEventListener('click', () => { closePopover(); setAttributes({ groupBy: property.id }); });
            box.append(button);
          }
        });
      }
      const groupBy = (database: Page) => { const properties = schemaOf(database).filter(groupable); return properties.find(p => p.id === settings().groupBy) ?? properties[0]; };
      const newRow = async (database: Page, values?: Record<string, unknown>) => {
        const created = await host.createRow(database.id, values);
        if (created) requestAnimationFrame(() => dom.querySelector<HTMLInputElement>(`[data-row="${CSS.escape(created.id)}"] .database-title-input`)?.focus());
      };
      const titleInput = (row: Page) => {
        const title = el('input', 'database-input database-title-input'); title.value = row.title; title.placeholder = 'Sans titre'; title.setAttribute('aria-label', 'Nom de la ligne');
        title.addEventListener('change', () => host.update(row.id, { title: title.value }));
        title.addEventListener('keydown', event => { if (event.key === 'Enter') title.blur(); });
        return title;
      };

      function table(database: Page, properties: Property[], rows: Page[]) {
        const scroll = el('div', 'database-scroll'), table = el('table', 'database-table'), head = el('tr');
        const nameHead = el('th', 'database-head'); nameHead.append(el('span', 'database-type-icon', 'Aa'), 'Nom'); head.append(nameHead);
        for (const property of properties) {
          const th = el('th', 'database-head'), button = el('button'); button.type = 'button';
          button.append(el('span', 'database-type-icon', typeIcons[property.type]), property.name);
          button.addEventListener('click', () => propertyMenu(button, host, database.id, property.id));
          th.append(button); head.append(th);
        }
        const add = el('th', 'database-head database-add'), plus = el('button', '', '+'); plus.type = 'button'; plus.setAttribute('aria-label', 'Ajouter une propriété');
        plus.addEventListener('click', () => addPropertyMenu(plus, host, database.id)); add.append(plus); head.append(add);
        const thead = el('thead'), body = el('tbody'); thead.append(head);
        for (const row of rows) {
          const tr = el('tr'); tr.dataset.row = row.id;
          const titleCell = el('td', 'database-cell database-cell-title');
          const open = el('button', 'database-open', 'Ouvrir'); open.type = 'button'; open.addEventListener('click', () => host.open(row.id));
          titleCell.append(titleInput(row), open); tr.append(titleCell);
          for (const property of properties) { const td = el('td', `database-cell database-cell-${property.type}`); td.append(valueEditor(host, database, row, property)); tr.append(td); }
          tr.append(el('td', 'database-cell')); body.append(tr);
        }
        table.append(thead, body); scroll.append(table);
        const button = el('button', 'database-new-row', '+ Nouvelle page'); button.type = 'button';
        button.addEventListener('click', () => void newRow(database));
        scroll.append(button);
        return scroll;
      }

      /** Notion's board: one column per option (« Sans … » first), cards dragged between columns change the value. */
      function board(database: Page, properties: Property[], rows: Page[]) {
        const group = groupBy(database);
        const wrap = el('div', 'database-board');
        if (!group) { wrap.append(el('div', 'database-missing', 'Ajoutez une propriété Sélection ou Statut pour regrouper les cartes.')); return wrap; }
        const valueOf = (row: Page) => { const value = FotionMark.readCell(group, row.values?.[group.id]); return typeof value === 'string' ? value : ''; };
        const names = group.options.map(option => option.name);
        const columns = [...(rows.some(row => !names.includes(valueOf(row))) ? [''] : []), ...names];
        for (const name of columns) {
          const cards = rows.filter(row => name ? valueOf(row) === name : !names.includes(valueOf(row)));
          const column = el('div', 'database-column'); column.dataset.group = name;
          const header = el('div', 'database-column-header');
          header.append(name ? pill(group, name) : el('span', 'database-tag', `Sans ${group.name.toLocaleLowerCase()}`), el('span', 'database-count', String(cards.length)));
          column.append(header);
          for (const row of cards) {
            const card = el('div', 'database-card'); card.draggable = editor.isEditable; card.dataset.row = row.id;
            const title = el('button', 'database-card-title', row.title || 'Sans titre'); title.type = 'button';
            if (row.icon) title.prepend(el('span', 'database-card-icon', row.icon));
            title.addEventListener('click', () => host.open(row.id));
            card.append(title);
            for (const property of properties.filter(p => p.id !== group.id && (p.type === 'select' || p.type === 'multi-select' || p.type === 'status'))) {
              const used = FotionMark.optionNames(FotionMark.readCell(property, row.values?.[property.id]));
              if (!used.length) continue;
              const tags = el('div', 'database-card-tags'); used.forEach(n => tags.append(pill(property, n))); card.append(tags);
            }
            card.addEventListener('dragstart', event => { event.dataTransfer?.setData('application/x-fotion-row', row.id); card.classList.add('dragging'); });
            card.addEventListener('dragend', () => card.classList.remove('dragging'));
            column.append(card);
          }
          column.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('application/x-fotion-row')) { event.preventDefault(); column.classList.add('drop-target'); } });
          column.addEventListener('dragleave', () => column.classList.remove('drop-target'));
          column.addEventListener('drop', event => {
            event.preventDefault(); column.classList.remove('drop-target');
            const row = host.pages().find(page => page.id === event.dataTransfer?.getData('application/x-fotion-row'));
            if (row && valueOf(row) !== name) store(host, database, row, group, FotionMark.writeCell(group, name));
          });
          const add = el('button', 'database-column-add', '+ Nouvelle page'); add.type = 'button';
          add.addEventListener('click', () => void newRow(database, name ? { [group.id]: name } : undefined));
          column.append(add); wrap.append(column);
        }
        return wrap;
      }

      function render() {
        // A field being typed in is never replaced; the view re-renders when it loses focus.
        if (document.activeElement instanceof HTMLInputElement && dom.contains(document.activeElement)) return;
        dom.replaceChildren();
        const database = host.pages().find(page => page.id === source());
        if (!database || database.trashed || !FotionMark.readDatabase(database.database)) {
          dom.append(el('div', 'database-missing', database ? 'Cette page n’est pas une base de données.' : 'Base de données introuvable.'));
          return;
        }
        const properties = schemaOf(database);
        const rows = host.pages().filter(row => row.parent === database.id && !row.trashed);
        if (database.id !== host.pageId()) {
          const title = el('input', 'database-title'); title.value = database.title; title.placeholder = 'Sans titre'; title.setAttribute('aria-label', 'Nom de la base de données');
          title.addEventListener('change', () => host.update(database.id, { title: title.value }));
          title.addEventListener('keydown', event => { if (event.key === 'Enter') title.blur(); });
          dom.append(title);
        }
        const layout = layouts.find(([id]) => id === settings().layout) ?? layouts[0];
        const tabs = el('div', 'database-tabs'), tab = el('button', 'database-tab'); tab.type = 'button';
        tab.append(el('span', 'database-type-icon', layout[2]), current.attrs.label || layout[1]);
        tab.setAttribute('aria-label', 'Options de la vue');
        tab.addEventListener('click', () => viewMenu(tab, database));
        tabs.append(tab); dom.append(tabs);
        dom.append(layout[0] === 'board' ? board(database, properties, rows) : table(database, properties, rows));
      }
      // Pages changed (saved, renamed, created): the editor marks those transactions.
      const changed = ({ transaction }: { transaction: Transaction }) => { if (transaction.getMeta('pageMentionsChanged')) render(); };
      const refocusOut = (event: FocusEvent) => { if (!dom.contains(event.relatedTarget as globalThis.Node)) requestAnimationFrame(render); };
      editor.on('transaction', changed); dom.addEventListener('focusout', refocusOut); render();
      return {
        dom,
        update(updated) { if (updated.type !== current.type) return false; current = updated; render(); return true; },
        // Keys, clicks and card drags inside the view belong to its fields, not to the document.
        stopEvent: event => !!(event.target as HTMLElement).closest?.('input, button, .database-card, .database-column'),
        ignoreMutation: () => true,
        destroy() { editor.off('transaction', changed); dom.removeEventListener('focusout', refocusOut); closePopover(); },
      };
    };
  },
});
