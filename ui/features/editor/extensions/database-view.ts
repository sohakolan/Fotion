import { DatabaseView as EngineDatabaseView, FotionMark, type Page } from '../../../../engine';
import type { Transaction } from '@tiptap/pm/state';
import { el, schemaOf, typeIcons, pill, valueEditor, propertyMenu, addPropertyMenu, openPopover, closePopover, store, type DatabaseHost } from '../lib/database-cells';

export type { DatabaseHost } from '../lib/database-cells';
type Property = FotionMark.Property;
const layouts = [['table', 'Tableau', '⊞'], ['board', 'Kanban', '▥']] as const;
const groupable = (property: Property) => property.type === 'select' || property.type === 'status';
const titleProperty: Property = { id: 'title', name: 'Nom', type: 'text', options: [] };
const operatorLabels: Record<FotionMark.Operator, string> = { '=': 'Est', '!=': 'N’est pas', '<': 'Inférieur à', '>': 'Supérieur à', '<=': 'Inférieur ou égal à', '>=': 'Supérieur ou égal à', contains: 'Contient', 'not contains': 'Ne contient pas', 'is empty': 'Est vide', 'is not empty': 'N’est pas vide' };
const dateLabels: Partial<Record<FotionMark.Operator, string>> = { '<': 'Est avant', '>': 'Est après', '<=': 'Est le ou avant', '>=': 'Est le ou après' };
/** Notion's small dropdown inside a menu: the current choice with ⌄, the choices listed under it, ✓ on the chosen one. */
const select = (label: string, choices: readonly (readonly [string, string])[], value: string, onChange: (value: string) => void) => {
  const wrap = el('div', 'database-dropdown'), trigger = el('button', 'database-dropdown-trigger'); trigger.type = 'button';
  trigger.setAttribute('aria-label', label); trigger.setAttribute('aria-haspopup', 'listbox'); trigger.setAttribute('aria-expanded', 'false');
  trigger.append(el('span', 'database-dropdown-value', choices.find(([id]) => id === value)?.[1] ?? value), el('span', 'database-dropdown-caret', '⌄'));
  const list = el('div', 'database-dropdown-list'); list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', label); list.hidden = true;
  const toggle = (open: boolean) => { list.hidden = !open; trigger.setAttribute('aria-expanded', String(open)); if (open) list.querySelector<HTMLElement>('[aria-selected="true"], button')?.focus(); };
  for (const [id, text] of choices) {
    const option = el('button', 'kit-menu-item database-dropdown-option', text); option.type = 'button'; option.setAttribute('role', 'option'); option.setAttribute('aria-selected', String(id === value));
    if (id === value) option.append(el('span', 'database-menu-check', '✓'));
    option.addEventListener('click', () => { toggle(false); if (id !== value) onChange(id); });
    list.append(option);
  }
  trigger.addEventListener('click', () => toggle(list.hidden === true));
  wrap.addEventListener('focusout', event => { if (!wrap.contains(event.relatedTarget as globalThis.Node)) toggle(false); });
  wrap.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !list.hidden) { event.stopPropagation(); toggle(false); trigger.focus(); }
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !list.hidden) {
      event.preventDefault(); const items = [...list.children] as HTMLElement[], at = items.indexOf(document.activeElement as HTMLElement);
      items[(at + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    }
  });
  wrap.append(trigger, list); return wrap;
};

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
      /** Notion's view search is not saved: it lasts while the page is open. */
      let search: string | undefined;
      /** View settings live in the directive: `layout`, `groupBy`, `filter`, `sort`. Defaults are never written. */
      const setAttributes = (patch: Record<string, string | undefined>) => {
        const pos = getPos(); if (typeof pos !== 'number' || !editor.isEditable) return;
        const next = { ...attributes(), ...patch };
        for (const [key, value] of Object.entries(next)) if (!value || (key === 'layout' && value === 'table')) delete next[key];
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
      const filters = () => FotionMark.parseFilter(settings().filter as string | undefined) ?? [];
      const sorts = () => FotionMark.parseSort(settings().sort as string | undefined);
      const propertyOf = (database: Page, id: string) => id === 'title' ? titleProperty : schemaOf(database).find(p => p.id === id);
      const choices = (database: Page) => [titleProperty, ...schemaOf(database)];
      const setFilters = (rules: FotionMark.FilterRule[]) => setAttributes({ filter: FotionMark.writeFilter(rules) });
      const setSorts = (rules: FotionMark.SortRule[]) => setAttributes({ sort: FotionMark.writeSort(rules) });
      const propertyLabel = (property: Property) => { const label = el('span', 'database-menu-label'); label.append(el('span', 'database-type-icon', property.id === 'title' ? 'Aa' : typeIcons[property.type]), property.name); return label; };

      /** Notion's « Trier » menu: one line per sort (property, direction, ×), then « + Ajouter un tri ». */
      function sortMenu(anchor: HTMLElement, database: Page) {
        openPopover(anchor, 'sort-menu', function draw(box) {
          box.replaceChildren();
          const rules = sorts();
          rules.forEach((rule, index) => {
            const line = el('div', 'database-rule');
            const others = choices(database).filter(p => p.id === rule.property || !rules.some(r => r.property === p.id));
            line.append(
              select('Propriété du tri', others.map(p => [p.id, p.name] as const), rule.property, property => { rules[index] = { ...rule, property }; setSorts(rules); draw(box); }),
              select('Ordre du tri', [['asc', 'Croissant'], ['desc', 'Décroissant']], rule.direction, direction => { rules[index] = { ...rule, direction: direction as 'asc' | 'desc' }; setSorts(rules); draw(box); }),
            );
            const remove = el('button', 'database-rule-remove', '×'); remove.type = 'button'; remove.setAttribute('aria-label', 'Supprimer le tri');
            remove.addEventListener('click', () => { rules.splice(index, 1); setSorts(rules); if (rules.length) draw(box); else closePopover(); });
            line.append(remove); box.append(line);
          });
          const free = choices(database).filter(p => !rules.some(r => r.property === p.id));
          if (rules.length) { if (free.length) { const add = el('button', 'kit-menu-item', '+ Ajouter un tri'); add.type = 'button'; add.addEventListener('click', () => { setSorts([...rules, { property: free[0].id, direction: 'asc' }]); draw(box); }); box.append(add); } return; }
          box.append(el('div', 'popover-heading', 'Trier par'));
          for (const property of free) {
            const button = el('button', 'kit-menu-item'); button.type = 'button'; button.append(propertyLabel(property)); button.setAttribute('aria-label', property.name);
            button.addEventListener('click', () => { setSorts([{ property: property.id, direction: 'asc' }]); draw(box); });
            box.append(button);
          }
        });
      }

      /** « Filtrer » : choose a property; the new rule opens at once, as in Notion. */
      function addFilterMenu(anchor: HTMLElement, database: Page) {
        openPopover(anchor, 'filter-menu', box => {
          box.append(el('div', 'popover-heading', 'Filtrer par'));
          for (const property of choices(database)) {
            const button = el('button', 'kit-menu-item'); button.type = 'button'; button.append(propertyLabel(property)); button.setAttribute('aria-label', property.name);
            button.addEventListener('click', () => {
              const rules = [...filters(), { property: property.id, op: FotionMark.operatorsFor(property.id === 'title' ? 'title' : property.type)[0], ...(property.type === 'checkbox' ? { value: 'true' } : {}) }];
              setFilters(rules);
              requestAnimationFrame(() => { const chip = dom.querySelectorAll<HTMLElement>('.database-filter-chip')[rules.length - 1]; if (chip) filterMenu(chip, database, rules.length - 1); });
            });
            box.append(button);
          }
        });
      }

      /** One filter rule: operator, value, deletion. Changes apply as they are made. */
      function filterMenu(anchor: HTMLElement, database: Page, index: number) {
        openPopover(anchor, 'filter-rule-menu', box => {
          const rule = filters()[index], property = rule && propertyOf(database, rule.property);
          if (!rule || !property) return;
          const change = (patch: Partial<FotionMark.FilterRule>) => { const rules = filters(); rules[index] = { ...rules[index], ...patch }; if (patch.op?.startsWith('is ')) delete rules[index].value; setFilters(rules); };
          const head = el('div', 'database-rule');
          const ops = FotionMark.operatorsFor(property.id === 'title' ? 'title' : property.type);
          head.append(el('span', 'database-rule-name', property.name));
          if (ops.length > 1) head.append(select('Condition du filtre', ops.map(op => [op, (property.type === 'date' && dateLabels[op]) || operatorLabels[op]] as const), rule.op, op => { change({ op: op as FotionMark.Operator }); value.hidden = op.startsWith('is '); }));
          box.append(head);
          let value: HTMLElement;
          if (property.type === 'checkbox') value = select('Valeur du filtre', [['true', 'Coché'], ['false', 'Non coché']], rule.value ?? 'true', v => change({ value: v }));
          else if (property.type === 'select' || property.type === 'status' || property.type === 'multi-select') value = select('Valeur du filtre', [['', 'Choisir une option'], ...property.options.map(o => [o.name, o.name] as const)], rule.value ?? '', v => change({ value: v }));
          else {
            const input = el('input', 'database-menu-input'); input.setAttribute('aria-label', 'Valeur du filtre'); input.placeholder = 'Saisir une valeur…';
            if (property.type === 'date') input.type = 'date';
            if (property.type === 'number') input.inputMode = 'decimal';
            input.value = rule.value === 'today' ? new Date().toISOString().slice(0, 10) : rule.value ?? '';
            input.addEventListener('input', () => change({ value: input.value }));
            input.addEventListener('keydown', event => { if (event.key === 'Enter') closePopover(); });
            value = input;
          }
          value.hidden = rule.op.startsWith('is ');
          box.append(value, el('div', 'popover-divider'));
          const remove = el('button', 'kit-menu-item database-menu-danger', 'Supprimer le filtre'); remove.type = 'button';
          remove.addEventListener('click', () => { setFilters(filters().filter((_, i) => i !== index)); closePopover(); });
          box.append(remove);
        });
      }

      /** Toolbar right of the tabs (Filtrer, Trier, Rechercher) and, under it, the sort and filter chips. */
      function toolbar(database: Page, tabs: HTMLElement, body: () => void) {
        const tools = el('div', 'database-tools');
        const button = (label: string, text: string, active: boolean, onClick: (anchor: HTMLElement) => void) => {
          const b = el('button', `database-tool${active ? ' active' : ''}`, text); b.type = 'button'; b.setAttribute('aria-label', label);
          b.addEventListener('click', () => onClick(b)); tools.append(b); return b;
        };
        button('Filtrer', 'Filtrer', filters().length > 0, anchor => addFilterMenu(anchor, database));
        button('Trier', 'Trier', sorts().length > 0, anchor => sortMenu(anchor, database));
        const field = el('input', 'database-search'); field.placeholder = 'Rechercher…'; field.setAttribute('aria-label', 'Rechercher dans la base');
        field.value = search ?? ''; field.hidden = search === undefined;
        field.addEventListener('input', () => { search = field.value; body(); });
        field.addEventListener('keydown', event => { if (event.key === 'Escape') { search = undefined; field.hidden = true; body(); } });
        field.addEventListener('blur', () => { if (!field.value) { search = undefined; field.hidden = true; } });
        button('Rechercher', '⌕', !!search, () => { search ??= ''; field.hidden = false; field.focus(); });
        tools.append(field); tabs.append(tools);
        const rules = filters(), order = sorts();
        if (!rules.length && !order.length) return undefined;
        const chips = el('div', 'database-chips');
        if (order.length) {
          const chip = el('button', 'database-chip database-sort-chip'); chip.type = 'button';
          const first = propertyOf(database, order[0].property);
          chip.textContent = order.length > 1 ? `${order.length} tris` : `${order[0].direction === 'desc' ? '↓' : '↑'} ${first?.name ?? order[0].property}`;
          chip.addEventListener('click', () => sortMenu(chip, database)); chips.append(chip);
        }
        rules.forEach((rule, index) => {
          const property = propertyOf(database, rule.property);
          const chip = el('button', `database-chip database-filter-chip${rule.value || rule.op.startsWith('is ') ? ' active' : ''}`); chip.type = 'button';
          const condition = rule.op.startsWith('is ') ? `: ${operatorLabels[rule.op].toLocaleLowerCase()}` : rule.value ? `: ${property?.type === 'checkbox' ? (rule.value === 'true' ? 'coché' : 'non coché') : rule.value}` : '';
          chip.textContent = `${property?.name ?? rule.property}${condition}`;
          chip.addEventListener('click', () => filterMenu(chip, database, index)); chips.append(chip);
        });
        const add = el('button', 'database-chip database-chip-add', '+ Filtre'); add.type = 'button';
        add.addEventListener('click', () => addFilterMenu(add, database)); chips.append(add);
        return chips;
      }
      /** A new row created under a filter gets the values it asks for, so it stays visible (Notion does the same). */
      const filterValues = (database: Page) => Object.fromEntries(filters().flatMap(rule => {
        const property = propertyOf(database, rule.property);
        if (!property || property.id === 'title' || !rule.value) return [];
        if (rule.op === '=' && property.type !== 'date') return [[property.id, FotionMark.writeCell(property, property.type === 'checkbox' ? rule.value === 'true' : rule.value)]];
        if (rule.op === 'contains' && property.type === 'multi-select') return [[property.id, [rule.value]]];
        return [];
      }).filter(([, value]) => value !== undefined));
      const groupBy = (database: Page) => { const properties = schemaOf(database).filter(groupable); return properties.find(p => p.id === settings().groupBy) ?? properties[0]; };
      const newRow = async (database: Page, values?: Record<string, unknown>) => {
        const merged = { ...filterValues(database), ...values };
        const created = await host.createRow(database.id, Object.keys(merged).length ? merged : undefined);
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
        tabs.append(tab);
        const content = el('div', 'database-content');
        const body = () => {
          const shown = FotionMark.queryRows(rows, properties, { filter: filters(), sort: sorts(), search });
          content.replaceChildren(layout[0] === 'board' ? board(database, properties, shown) : table(database, properties, shown));
        };
        const chips = toolbar(database, tabs, body);
        dom.append(tabs); if (chips) dom.append(chips); dom.append(content); body();
      }
      // Pages changed (saved, renamed, created): the editor marks those transactions.
      const changed = ({ transaction }: { transaction: Transaction }) => { if (transaction.getMeta('pageMentionsChanged')) render(); };
      const refocusOut = (event: FocusEvent) => { if (!dom.contains(event.relatedTarget as globalThis.Node)) requestAnimationFrame(render); };
      editor.on('transaction', changed); dom.addEventListener('focusout', refocusOut); render();
      return {
        dom,
        update(updated) { if (updated.type !== current.type) return false; current = updated; render(); return true; },
        // Keys, clicks and card drags inside the view belong to its fields, not to the document.
        stopEvent: event => !!(event.target as HTMLElement).closest?.('input, button, select, .database-card, .database-column'),
        ignoreMutation: () => true,
        destroy() { editor.off('transaction', changed); dom.removeEventListener('focusout', refocusOut); closePopover(); },
      };
    };
  },
});
