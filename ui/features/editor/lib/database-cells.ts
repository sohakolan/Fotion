import { FotionMark, type Page, type PageEdit } from '../../../../engine';

type Property = FotionMark.Property;
type PropertyType = FotionMark.PropertyType;

/** What database views need from the application: pages, saving and navigation. */
export interface DatabaseHost {
  pageId: () => string;
  pages: () => Page[];
  update: (id: string, patch: Partial<PageEdit>) => void;
  createRow: (database: string, values?: Record<string, unknown>) => Promise<Page | undefined>;
  open: (id: string) => void;
}

export const typeLabels: Record<PropertyType, string> = { text: 'Texte', number: 'Nombre', select: 'Sélection', 'multi-select': 'Sélection multiple', status: 'Statut', date: 'Date', checkbox: 'Case à cocher', url: 'URL', email: 'E-mail', phone: 'Téléphone' };
export const typeIcons: Record<PropertyType, string> = { text: '≡', number: '#', select: '⌄', 'multi-select': '☰', status: '◔', date: '▦', checkbox: '☑', url: '🔗', email: '@', phone: '☏' };
const statusGroups = [['todo', 'À faire'], ['doing', 'En cours'], ['done', 'Terminé']] as const;
const choice = (type: PropertyType) => type === 'select' || type === 'multi-select' || type === 'status';

export const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => { const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node; };
export const schemaOf = (page: Page | undefined) => FotionMark.readDatabase(page?.database)?.properties ?? [];
/** The database page of a row, when its parent is a database. */
export const databaseOf = (row: Page | undefined, pages: Page[]) => { const parent = pages.find(page => page.id === row?.parent); return parent && FotionMark.readDatabase(parent.database) ? parent : undefined; };

// One popover at a time, closed by a click outside or Escape, like Notion's menus.
let popover: HTMLElement | undefined;
export function closePopover() { popover?.remove(); popover = undefined; }
let listening = false;
// Escape first closes a dropdown open inside the menu, then the menu.
const openDropdown = (target: EventTarget | null) => !!(target as Element | null)?.closest?.('.database-dropdown')?.querySelector(':scope > .database-dropdown-list:not([hidden])');
export function openPopover(anchor: HTMLElement, className: string, build: (box: HTMLElement) => void) {
  closePopover();
  // Registered on first use, so the module also loads without a DOM (unit tests of the editor schema).
  if (!listening) {
    listening = true;
    document.addEventListener('pointerdown', event => { if (popover && !popover.contains(event.target as globalThis.Node)) closePopover(); }, true);
    document.addEventListener('keydown', event => { if (popover && event.key === 'Escape' && !openDropdown(event.target)) { event.stopPropagation(); closePopover(); } }, true);
  }
  const box = el('div', `database-menu popover kit-menu ${className}`);
  build(box);
  const rect = anchor.getBoundingClientRect();
  Object.assign(box.style, { position: 'fixed', left: `${Math.max(8, Math.min(rect.left, window.innerWidth - 268))}px`, top: `${Math.min(rect.bottom + 4, window.innerHeight - 320)}px` });
  document.body.append(box); popover = box;
  box.querySelector<HTMLElement>('input, button')?.focus();
  return box;
}
function item(label: string | Node, onClick: () => void, className = '') {
  const button = el('button', `kit-menu-item ${className}`); button.type = 'button';
  button.append(label); button.addEventListener('click', onClick); return button;
}

/** Fresh state each time: popovers stay open while the pages they edit are saved and replaced. */
interface Target { host: DatabaseHost; database: string; row?: string; property: string }
const fresh = (target: Target) => {
  const pages = target.host.pages(), database = pages.find(page => page.id === target.database);
  return { database, row: pages.find(page => page.id === target.row), property: schemaOf(database).find(p => p.id === target.property) };
};

/** Stores a value in a row (undefined removes the key); option names not yet in the schema are added with Notion's next colour. */
export function store(host: DatabaseHost, database: Page, row: Page, property: Property, stored: unknown) {
  const values = { ...(row.values ?? {}) };
  if (stored === undefined) delete values[property.id]; else values[property.id] = stored;
  if (JSON.stringify(values) === JSON.stringify(row.values ?? {})) return;
  addOptions(host, database, property, FotionMark.optionNames(stored));
  host.update(row.id, { values });
}
function addOptions(host: DatabaseHost, database: Page, property: Property, names: string[]) {
  if (!choice(property.type)) return;
  const options = [...property.options];
  for (const name of names) if (!options.some(option => option.name === name)) options.push({ name, color: FotionMark.nextOptionColor(options) });
  if (options.length !== property.options.length) host.update(database.id, { database: FotionMark.updateProperty(database.database, property.id, { options }) });
}

export function pill(property: Property, name: string) {
  const tag = el('span', 'database-tag', name); tag.dataset.color = property.options.find(option => option.name === name)?.color ?? 'default';
  if (property.type === 'status') { tag.classList.add('database-status'); tag.prepend(el('span', 'database-status-dot')); }
  return tag;
}

/** Notion's option menu: chosen options with ×, a search field that also creates, and the options by group for a status. */
export function optionPicker(anchor: HTMLElement, target: Target) {
  openPopover(anchor, 'option-picker', box => {
    const field = el('div', 'option-picker-field'), input = el('input', 'option-picker-input'), list = el('div', 'option-picker-list');
    input.placeholder = 'Rechercher une option…'; input.setAttribute('aria-label', 'Rechercher ou créer une option');
    const chosen = () => { const { row, property } = fresh(target); return property ? FotionMark.optionNames(FotionMark.readCell(property, row?.values?.[property.id])) : []; };
    const set = (names: string[]) => { const { database, row, property } = fresh(target); if (database && row && property) store(target.host, database, row, property, FotionMark.writeCell(property, names)); };
    const pick = (name: string) => {
      const { property } = fresh(target); if (!property) return;
      if (property.type === 'multi-select') { const current = chosen(); set(current.includes(name) ? current : [...current, name]); input.value = ''; draw(); input.focus(); }
      else { set([name]); closePopover(); }
    };
    function draw() {
      const { property } = fresh(target); if (!property) return closePopover();
      // The search field stays in place: moving a focused input would drop the focus.
      field.querySelectorAll('.database-tag').forEach(tag => tag.remove());
      for (const name of chosen()) {
        const tag = pill(property, name), remove = el('button', 'database-tag-remove', '×'); remove.type = 'button'; remove.setAttribute('aria-label', `Retirer ${name}`);
        remove.addEventListener('click', () => { set(chosen().filter(n => n !== name)); draw(); input.focus(); });
        tag.append(remove); field.insertBefore(tag, input);
      }
      const query = input.value.trim(), lower = query.toLocaleLowerCase();
      const options = property.options.filter(option => option.name.toLocaleLowerCase().includes(lower));
      list.replaceChildren(el('div', 'popover-heading', 'Sélectionnez une option ou créez-en une'));
      const groups = property.type === 'status' ? statusGroups.map(([id, label]) => [label, options.filter(o => (o.group ?? 'todo') === id)] as const) : [['', options] as const];
      for (const [label, entries] of groups) {
        if (label && entries.length) list.append(el('div', 'popover-heading', label));
        for (const option of entries) list.append(item(pill(property, option.name), () => pick(option.name), 'option-picker-item'));
      }
      if (query && !property.options.some(option => option.name === query)) {
        const create = el('span'); create.append('Créer ', pill({ ...property, options: [...property.options, { name: query, color: FotionMark.nextOptionColor(property.options) }] }, query));
        list.append(item(create, () => pick(query), 'option-picker-create'));
      }
    }
    input.addEventListener('input', draw);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); list.querySelector<HTMLButtonElement>('.kit-menu-item')?.click(); }
      if (event.key === 'Backspace' && !input.value) { const current = chosen(); if (current.length && fresh(target).property?.type === 'multi-select') { set(current.slice(0, -1)); draw(); } }
    });
    field.append(input); box.append(field, list); draw();
  });
}

/** `2026-11-20` → « 20 novembre 2026 », as Notion shows a date property. */
export const formatDay = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const localToday = () => new Date().toLocaleDateString('sv-SE');
const monthNames = (month: string) => new Date(`${month}-01T00:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

/** Notion's date menu: typed date, month grid (Monday first, today and the chosen day marked), « Effacer ». */
export function datePicker(anchor: HTMLElement, target: Target) {
  openPopover(anchor, 'date-picker', box => {
    const current = () => { const { row, property } = fresh(target); const value = property && FotionMark.readCell(property, row?.values?.[property.id]); return typeof value === 'string' ? value.slice(0, 10) : ''; };
    const set = (day: string) => { const { database, row, property } = fresh(target); if (database && row && property) store(target.host, database, row, property, FotionMark.writeCell(property, day)); };
    let month = (current() || localToday()).slice(0, 7);
    const field = el('input', 'database-menu-input'); field.setAttribute('aria-label', 'Date'); field.placeholder = 'AAAA-MM-JJ'; field.value = current();
    field.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const { property } = fresh(target); const day = field.value.trim();
      if (!day) { set(''); closePopover(); return; }
      if (property && FotionMark.writeCell(property, day) !== undefined) { set(day); closePopover(); } else field.setAttribute('aria-invalid', 'true');
    });
    const head = el('div', 'date-picker-head'), grid = el('div', 'date-picker-grid');
    const step = (delta: number) => { const [y, m] = month.split('-').map(Number); month = new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7); draw(); };
    function draw() {
      const navigation = (label: string, text: string, action: () => void) => { const b = el('button', 'date-picker-nav', text); b.type = 'button'; b.setAttribute('aria-label', label); b.addEventListener('click', action); return b; };
      head.replaceChildren(el('span', 'date-picker-month', monthNames(month)), navigation('Aujourd’hui', 'Aujourd’hui', () => { month = localToday().slice(0, 7); draw(); }), navigation('Mois précédent', '‹', () => step(-1)), navigation('Mois suivant', '›', () => step(1)));
      grid.replaceChildren(...['lu', 'ma', 'me', 'je', 've', 'sa', 'di'].map(day => el('span', 'date-picker-weekday', day)));
      const [y, m] = month.split('-').map(Number), first = new Date(Date.UTC(y, m - 1, 1)), start = Date.UTC(y, m - 1, 1 - (first.getUTCDay() + 6) % 7);
      const chosen = current(), today = localToday();
      for (let i = 0; i < 42; i++) {
        const day = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
        const button = el('button', 'date-picker-day', String(Number(day.slice(8)))); button.type = 'button';
        button.setAttribute('aria-label', formatDay(day));
        button.classList.toggle('outside', day.slice(0, 7) !== month); button.classList.toggle('today', day === today);
        if (day === chosen) button.setAttribute('aria-pressed', 'true');
        button.addEventListener('click', () => { set(day); closePopover(); });
        grid.append(button);
      }
    }
    const clear = el('button', 'kit-menu-item', 'Effacer'); clear.type = 'button';
    clear.addEventListener('click', () => { set(''); closePopover(); });
    box.append(field, head, grid, el('div', 'popover-divider'), clear); draw();
  });
}

/** The editor of one value, for a table cell, a board card or the properties of an open row. */
export function valueEditor(host: DatabaseHost, database: Page, row: Page, property: Property, options: { placeholder?: string } = {}) {
  const stored = row.values?.[property.id], value = FotionMark.readCell(property, stored);
  const label = `${property.name} de ${row.title || 'Sans titre'}`;
  if (value === undefined) {
    const kept = el('div', 'database-value database-value-invalid', String(Array.isArray(stored) ? stored.join(', ') : stored));
    kept.title = 'Valeur conservée : elle ne correspond pas au type de la propriété.'; return kept;
  }
  if (property.type === 'checkbox') {
    const wrap = el('div', 'database-value database-value-checkbox'), box = el('input'); box.type = 'checkbox'; box.checked = value === true; box.setAttribute('aria-label', label);
    box.addEventListener('change', () => store(host, database, row, property, FotionMark.writeCell(property, box.checked)));
    wrap.append(box); return wrap;
  }
  if (choice(property.type)) {
    const tags = el('button', 'database-value database-tags'); tags.type = 'button'; tags.setAttribute('aria-label', label);
    for (const name of FotionMark.optionNames(value)) tags.append(pill(property, name));
    if (!tags.childElementCount && options.placeholder) tags.append(el('span', 'database-empty', options.placeholder));
    tags.addEventListener('click', () => optionPicker(tags, { host, database: database.id, row: row.id, property: property.id }));
    return tags;
  }
  if (property.type === 'date') {
    const button = el('button', 'database-value database-date', typeof value === 'string' ? formatDay(value) : ''); button.type = 'button'; button.setAttribute('aria-label', label);
    if (value === null && options.placeholder) button.append(el('span', 'database-empty', options.placeholder));
    button.addEventListener('click', () => datePicker(button, { host, database: database.id, row: row.id, property: property.id }));
    return button;
  }
  const input = el('input', 'database-value database-input');
  input.setAttribute('aria-label', label);
  if (options.placeholder) input.placeholder = options.placeholder;
  const shown = value === null ? '' : String(value);
  input.value = shown;
  if (property.type === 'number') input.inputMode = 'decimal';
  if (property.type === 'email') input.type = 'email';
  if (property.type === 'url') input.type = 'url';
  input.addEventListener('change', () => store(host, database, row, property, FotionMark.writeCell(property, input.value)));
  input.addEventListener('keydown', event => { if (event.key === 'Enter') input.blur(); if (event.key === 'Escape') { input.value = shown; input.blur(); } });
  return input;
}

/** Rewrites every row after a type change; values that cannot convert are left as they are. */
function changeType(host: DatabaseHost, database: Page, property: Property, type: PropertyType) {
  const names = new Set<string>();
  for (const row of host.pages().filter(page => page.parent === database.id)) {
    if (!(property.id in (row.values ?? {}))) continue;
    const converted = FotionMark.convertValue(row.values![property.id], type);
    if (converted === undefined) continue;
    FotionMark.optionNames(converted).forEach(name => names.add(name));
    const values = { ...row.values }; if (converted === null) delete values[property.id]; else values[property.id] = converted;
    host.update(row.id, { values });
  }
  const options = choice(type) ? [...property.options] : [];
  if (choice(type)) for (const name of names) if (!options.some(o => o.name === name)) options.push({ name, color: FotionMark.nextOptionColor(options) });
  host.update(database.id, { database: FotionMark.updateProperty(database.database, property.id, { type, ...(choice(type) ? { options } : {}) }) });
}

/** Notion's property menu: name, type (with conversion) and deletion. */
export function propertyMenu(anchor: HTMLElement, host: DatabaseHost, databaseId: string, propertyId: string) {
  openPopover(anchor, 'property-menu', box => {
    const { database, property } = fresh({ host, database: databaseId, property: propertyId });
    if (!database || !property) return;
    const name = el('input', 'database-menu-input'); name.value = property.name; name.setAttribute('aria-label', 'Nom de la propriété');
    const rename = () => { const { database: db, property: p } = fresh({ host, database: databaseId, property: propertyId }); const value = name.value.trim(); if (db && p && value && value !== p.name) host.update(db.id, { database: FotionMark.updateProperty(db.database, p.id, { name: value }) }); };
    name.addEventListener('keydown', event => { if (event.key === 'Enter') { rename(); closePopover(); } });
    name.addEventListener('blur', rename);
    box.append(name, el('div', 'popover-heading', 'Type'));
    for (const type of FotionMark.propertyTypes) {
      const label = el('span', 'database-menu-label'); label.append(el('span', 'database-type-icon', typeIcons[type]), typeLabels[type]);
      if (type === property.type) label.append(el('span', 'database-menu-check', '✓'));
      const button = item(label, () => { if (type !== property.type) changeType(host, database, property, type); closePopover(); });
      button.setAttribute('aria-label', typeLabels[type]); box.append(button);
    }
    box.append(el('div', 'popover-divider'));
    box.append(item('Supprimer la propriété', () => { const { database: db } = fresh({ host, database: databaseId, property: propertyId }); if (db) host.update(db.id, { database: FotionMark.removeProperty(db.database, propertyId) }); closePopover(); }, 'database-menu-danger'));
  });
}

/** « + » : choose a type; the property is named after it, like Notion. */
export function addPropertyMenu(anchor: HTMLElement, host: DatabaseHost, databaseId: string, onAdded?: (id: string) => void) {
  openPopover(anchor, 'property-menu', box => {
    box.append(el('div', 'popover-heading', 'Type'));
    for (const type of FotionMark.propertyTypes) {
      const label = el('span', 'database-menu-label'); label.append(el('span', 'database-type-icon', typeIcons[type]), typeLabels[type]);
      const button = item(label, () => {
        const database = host.pages().find(page => page.id === databaseId); if (!database) return;
        const taken = schemaOf(database), used = new Set(taken.map(p => p.name));
        let name = typeLabels[type];
        for (let n = 2; used.has(name); n++) name = `${typeLabels[type]} ${n}`;
        const id = FotionMark.newPropertyId(name, taken.map(p => p.id));
        host.update(database.id, { database: FotionMark.addProperty(database.database, { id, name, type }) });
        onAdded?.(id);
        closePopover();
      });
      button.setAttribute('aria-label', typeLabels[type]); box.append(button);
    }
  });
}

/** Notion's properties under the title of an open row: icon and name (menu), value editor, then « Ajouter une propriété ». */
export function renderProperties(container: HTMLElement, host: DatabaseHost, row: Page) {
  if (document.activeElement instanceof HTMLInputElement && container.contains(document.activeElement)) return;
  container.replaceChildren();
  const database = databaseOf(row, host.pages());
  if (!database) return;
  for (const property of schemaOf(database)) {
    const line = el('div', 'page-property');
    const name = el('button', 'page-property-name'); name.type = 'button';
    name.append(el('span', 'database-type-icon', typeIcons[property.type]), el('span', 'page-property-label', property.name));
    name.addEventListener('click', () => propertyMenu(name, host, database.id, property.id));
    line.append(name, valueEditor(host, database, row, property, { placeholder: 'Vide' }));
    container.append(line);
  }
  const add = el('button', 'page-property-add', '+ Ajouter une propriété'); add.type = 'button';
  add.addEventListener('click', () => addPropertyMenu(add, host, database.id));
  container.append(add);
}

/** A locked page: values and menus are shown, not edited; opening a row and searching still work. */
export function freeze(container: HTMLElement) {
  container.classList.add('database-readonly');
  for (const field of container.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, button')) {
    if (field.matches('.database-open, .database-card-title, .database-search, .database-tool[aria-label="Rechercher"]')) continue;
    if (field instanceof HTMLInputElement && field.type !== 'checkbox') field.readOnly = true; else field.disabled = true;
  }
}
