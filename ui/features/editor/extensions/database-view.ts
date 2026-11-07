import { DatabaseView as EngineDatabaseView, FotionMark, type Page, type PageEdit } from '../../../../engine';
import type { Transaction } from '@tiptap/pm/state';

type Property = FotionMark.Property;
/** What the table needs from the application: pages, saving and navigation. */
export interface DatabaseHost {
  pageId: () => string;
  pages: () => Page[];
  update: (id: string, patch: Partial<PageEdit>) => void;
  createRow: (database: string) => Promise<Page | undefined>;
  open: (id: string) => void;
}

const typeLabels: Record<FotionMark.PropertyType, string> = { text: 'Texte', number: 'Nombre', select: 'Sélection', 'multi-select': 'Sélection multiple', status: 'Statut', date: 'Date', checkbox: 'Case à cocher', url: 'URL', email: 'E-mail', phone: 'Téléphone' };
const typeIcons: Record<FotionMark.PropertyType, string> = { text: '≡', number: '#', select: '⌄', 'multi-select': '☰', status: '◔', date: '▦', checkbox: '☑', url: '🔗', email: '@', phone: '☏' };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => { const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node; };

/**
 * Notion's table view. Rows are the pages whose parent is the database; values are their front matter keys.
 * The view never holds data of its own: every change goes through the host, which saves the page files.
 */
export const DatabaseView = EngineDatabaseView.extend<{ host: DatabaseHost }>({
  addOptions: () => ({ host: { pageId: () => '', pages: () => [], update: () => undefined, createRow: async () => undefined, open: () => undefined } }),
  addNodeView() {
    const host = this.options.host;
    return ({ node, editor }) => {
      let current = node;
      const dom = el('div', 'fm-database-view'); dom.contentEditable = 'false';
      let menu: HTMLElement | undefined;
      const closeMenu = () => { menu?.remove(); menu = undefined; };
      const source = () => (current.attrs.attributes?.src as string | undefined) || host.pageId();
      const database = () => host.pages().find(page => page.id === source());
      const schema = (page: Page) => FotionMark.readDatabase(page.database)?.properties ?? [];
      const saveSchema = (page: Page, next: Record<string, unknown>) => host.update(page.id, { database: next });

      function openMenu(anchor: HTMLElement, build: (box: HTMLElement) => void) {
        closeMenu();
        menu = el('div', 'database-menu popover kit-menu');
        build(menu);
        const box = anchor.getBoundingClientRect();
        Object.assign(menu.style, { position: 'fixed', left: `${Math.min(box.left, window.innerWidth - 248)}px`, top: `${box.bottom + 4}px` });
        document.body.append(menu);
        menu.querySelector<HTMLElement>('input, button')?.focus();
      }
      const outside = (event: PointerEvent) => { if (menu && !menu.contains(event.target as globalThis.Node)) closeMenu(); };
      document.addEventListener('pointerdown', outside, true);

      function propertyMenu(anchor: HTMLElement, page: Page, property: Property) {
        openMenu(anchor, box => {
          const name = el('input', 'database-menu-input'); name.value = property.name; name.setAttribute('aria-label', 'Nom de la propriété');
          const rename = () => { const value = name.value.trim(); if (value && value !== property.name) saveSchema(page, FotionMark.updateProperty(page.database, property.id, { name: value })); };
          name.addEventListener('keydown', event => { if (event.key === 'Enter') { rename(); closeMenu(); } if (event.key === 'Escape') closeMenu(); });
          name.addEventListener('blur', rename);
          box.append(name, el('div', 'popover-heading', `Type : ${typeLabels[property.type]}`));
        });
      }
      function addPropertyMenu(anchor: HTMLElement, page: Page) {
        openMenu(anchor, box => {
          box.append(el('div', 'popover-heading', 'Type'));
          for (const type of FotionMark.propertyTypes) {
            const item = el('button', 'kit-menu-item'); item.type = 'button';
            item.append(el('span', 'database-type-icon', typeIcons[type]), document.createTextNode(typeLabels[type]));
            item.addEventListener('click', () => {
              const taken = schema(page);
              const used = new Set(taken.map(p => p.name));
              let name = typeLabels[type];
              for (let n = 2; used.has(name); n++) name = `${typeLabels[type]} ${n}`;
              saveSchema(page, FotionMark.addProperty(page.database, { id: FotionMark.newPropertyId(name, taken.map(p => p.id)), name, type }));
              closeMenu();
            });
            box.append(item);
          }
        });
      }

      /** Writes one cell; a new select option is added to the schema with the next Notion colour. */
      function commit(page: Page, row: Page, property: Property, input: string | boolean) {
        const stored = FotionMark.writeCell(property, input);
        const values = { ...(row.values ?? {}) };
        if (stored === undefined) delete values[property.id]; else values[property.id] = stored;
        if (JSON.stringify(values) === JSON.stringify(row.values ?? {})) return;
        if (['select', 'status', 'multi-select'].includes(property.type)) {
          const names = Array.isArray(stored) ? stored as string[] : typeof stored === 'string' ? [stored] : [];
          const options = [...property.options];
          for (const name of names) if (!options.some(option => option.name === name)) options.push({ name, color: FotionMark.nextOptionColor(options) });
          if (options.length !== property.options.length) saveSchema(page, FotionMark.updateProperty(page.database, property.id, { options }));
        }
        host.update(row.id, { values });
      }
      function pill(property: Property, name: string) {
        const color = property.options.find(option => option.name === name)?.color ?? 'default';
        const tag = el('span', 'database-tag', name); tag.dataset.color = color; return tag;
      }
      function cell(page: Page, row: Page, property: Property) {
        const td = el('td', `database-cell database-cell-${property.type}`);
        const value = FotionMark.readCell(property, row.values?.[property.id]);
        if (value === undefined) { td.classList.add('database-cell-invalid'); td.textContent = String(row.values?.[property.id]); td.title = 'Valeur conservée : elle ne correspond pas au type de la propriété.'; return td; }
        const label = `${property.name} de ${row.title || 'Sans titre'}`;
        if (property.type === 'checkbox') {
          const box = el('input'); box.type = 'checkbox'; box.checked = value === true; box.setAttribute('aria-label', label);
          box.addEventListener('change', () => commit(page, row, property, box.checked));
          td.append(box); return td;
        }
        const input = el('input', 'database-input');
        input.setAttribute('aria-label', label);
        input.value = Array.isArray(value) ? value.join(', ') : value === null ? '' : String(value);
        if (property.type === 'date') input.type = 'date';
        if (property.type === 'number') input.inputMode = 'decimal';
        if (['select', 'status', 'multi-select'].includes(property.type)) {
          const list = el('datalist'); list.id = `database-options-${Math.random().toString(36).slice(2)}`;
          for (const option of property.options) list.append(Object.assign(el('option'), { value: option.name }));
          input.setAttribute('list', list.id);
          const tags = el('div', 'database-tags');
          for (const name of Array.isArray(value) ? value : value ? [String(value)] : []) tags.append(pill(property, name));
          tags.addEventListener('click', () => { td.classList.add('editing'); input.focus(); });
          input.addEventListener('blur', () => td.classList.remove('editing'));
          td.append(tags, list);
        }
        input.addEventListener('change', () => commit(page, row, property, input.value));
        input.addEventListener('keydown', event => { if (event.key === 'Enter') input.blur(); if (event.key === 'Escape') { input.value = Array.isArray(value) ? value.join(', ') : value === null ? '' : String(value); input.blur(); } });
        td.append(input); return td;
      }

      function render() {
        // A field being typed in is never replaced; the view re-renders when it loses focus.
        if (document.activeElement instanceof HTMLInputElement && dom.contains(document.activeElement)) return;
        dom.replaceChildren();
        const page = database();
        if (!page || page.trashed || !FotionMark.readDatabase(page.database)) {
          dom.append(el('div', 'database-missing', page ? 'Cette page n’est pas une base de données.' : 'Base de données introuvable.'));
          return;
        }
        const properties = schema(page);
        const rows = host.pages().filter(row => row.parent === page.id && !row.trashed);
        if (page.id !== host.pageId()) {
          const title = el('input', 'database-title'); title.value = page.title; title.placeholder = 'Sans titre'; title.setAttribute('aria-label', 'Nom de la base de données');
          title.addEventListener('change', () => host.update(page.id, { title: title.value }));
          title.addEventListener('keydown', event => { if (event.key === 'Enter') title.blur(); });
          dom.append(title);
        }
        const tabs = el('div', 'database-tabs'); tabs.append(el('span', 'database-tab', `⊞ ${current.attrs.label || 'Tableau'}`)); dom.append(tabs);
        const scroll = el('div', 'database-scroll');
        const table = el('table', 'database-table');
        const head = el('tr');
        const nameHead = el('th', 'database-head'); nameHead.append(el('span', 'database-type-icon', 'Aa'), document.createTextNode('Nom')); head.append(nameHead);
        for (const property of properties) {
          const th = el('th', 'database-head'); const button = el('button'); button.type = 'button';
          button.append(el('span', 'database-type-icon', typeIcons[property.type]), document.createTextNode(property.name));
          button.addEventListener('click', () => propertyMenu(button, page, property));
          th.append(button); head.append(th);
        }
        const add = el('th', 'database-head database-add'); const plus = el('button', '', '+'); plus.type = 'button'; plus.setAttribute('aria-label', 'Ajouter une propriété');
        plus.addEventListener('click', () => addPropertyMenu(plus, page)); add.append(plus); head.append(add);
        const thead = el('thead'); thead.append(head);
        const body = el('tbody');
        for (const row of rows) {
          const tr = el('tr');
          const titleCell = el('td', 'database-cell database-cell-title');
          const title = el('input', 'database-input'); title.value = row.title; title.placeholder = 'Sans titre'; title.setAttribute('aria-label', 'Nom de la ligne');
          title.addEventListener('change', () => host.update(row.id, { title: title.value }));
          title.addEventListener('keydown', event => { if (event.key === 'Enter') title.blur(); });
          const open = el('button', 'database-open', 'Ouvrir'); open.type = 'button'; open.addEventListener('click', () => host.open(row.id));
          titleCell.append(title, open); tr.append(titleCell);
          for (const property of properties) tr.append(cell(page, row, property));
          tr.append(el('td', 'database-cell')); body.append(tr);
        }
        table.append(thead, body); scroll.append(table);
        const newRow = el('button', 'database-new-row', '+ Nouvelle page'); newRow.type = 'button';
        newRow.addEventListener('click', async () => {
          const created = await host.createRow(page.id);
          if (created) requestAnimationFrame(() => dom.querySelector<HTMLInputElement>('tbody tr:last-child .database-cell-title input')?.focus());
        });
        scroll.append(newRow); dom.append(scroll);
      }
      // Pages changed (saved, renamed, created): the editor marks those transactions.
      const changed = ({ transaction }: { transaction: Transaction }) => { if (transaction.getMeta('pageMentionsChanged')) render(); };
      const refocusOut = (event: FocusEvent) => { if (!dom.contains(event.relatedTarget as globalThis.Node)) requestAnimationFrame(render); };
      editor.on('transaction', changed); dom.addEventListener('focusout', refocusOut); render();
      return {
        dom,
        update(updated) { if (updated.type !== current.type) return false; current = updated; render(); return true; },
        // Keys and clicks inside the table belong to its fields, not to the document.
        stopEvent: event => !!(event.target as HTMLElement).closest?.('input, button, .database-tags'),
        ignoreMutation: () => true,
        destroy() { editor.off('transaction', changed); dom.removeEventListener('focusout', refocusOut); document.removeEventListener('pointerdown', outside, true); closeMenu(); },
      };
    };
  },
});
