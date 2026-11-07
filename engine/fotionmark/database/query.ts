import { readCell, type CellValue, type Property } from './properties';

/**
 * Filters and sorts of a database view (docs/FOTIONMARK.md, « Filtres et tris »), stored as directive attributes:
 *   filter="status = \"En cours\" and due < today and tags contains Urgent and notes is empty"
 *   sort="due:asc,title:desc"
 * `title` is the page title (Notion's « Nom »). Rules are joined by `and`, as Notion's simple filters.
 */

export const operators = ['=', '!=', '<', '>', '<=', '>=', 'contains', 'not contains', 'is empty', 'is not empty'] as const;
export type Operator = typeof operators[number];
export interface FilterRule { property: string; op: Operator; value?: string }
export interface SortRule { property: string; direction: 'asc' | 'desc' }
/** A row as the query sees it: its title and its front matter values. */
export interface QueryRow { title: string; values?: Record<string, unknown> }

const unary: readonly Operator[] = ['is empty', 'is not empty'];
const word = /^[a-z][a-z0-9-]{0,63}$/;

/** Operators Notion offers for a property type; `title` behaves as text. */
export function operatorsFor(type: Property['type'] | 'title'): Operator[] {
  switch (type) {
    case 'number': case 'date': return ['=', '!=', '<', '>', '<=', '>=', 'is empty', 'is not empty'];
    case 'select': case 'status': return ['=', '!=', 'is empty', 'is not empty'];
    case 'multi-select': return ['contains', 'not contains', 'is empty', 'is not empty'];
    case 'checkbox': return ['='];
    default: return ['=', '!=', 'contains', 'not contains', 'is empty', 'is not empty'];
  }
}

/** Parses a filter; undefined when the text is not a valid expression (the attribute is then kept but ignored). */
export function parseFilter(text: string | undefined): FilterRule[] | undefined {
  if (!text?.trim()) return [];
  const tokens = text.match(/"(?:[^"\\]|\\.)*"|<=|>=|!=|[=<>]|[^\s"=<>!]+/g) ?? [];
  const rules: FilterRule[] = [];
  let i = 0;
  const take = (...words: string[]) => { if (words.every((w, n) => tokens[i + n] === w)) { i += words.length; return true; } return false; };
  while (i < tokens.length) {
    if (rules.length && !take('and')) return undefined;
    const property = tokens[i++];
    if (!property || !word.test(property)) return undefined;
    const op = take('is', 'not', 'empty') ? 'is not empty' : take('is', 'empty') ? 'is empty' : take('not', 'contains') ? 'not contains' : take('contains') ? 'contains' : (['=', '!=', '<', '>', '<=', '>='] as const).find(o => take(o));
    if (!op) return undefined;
    if (unary.includes(op)) { rules.push({ property, op }); continue; }
    const raw = tokens[i++];
    if (raw === undefined || raw === 'and') return undefined;
    rules.push({ property, op, value: raw.startsWith('"') ? raw.slice(1, -1).replace(/\\(.)/g, '$1') : raw });
  }
  return rules;
}

export function writeFilter(rules: readonly FilterRule[]): string {
  return rules.map(rule => unary.includes(rule.op) ? `${rule.property} ${rule.op}`
    : `${rule.property} ${rule.op} ${/^[^\s"=<>!]+$/.test(rule.value ?? '') && rule.value !== 'and' ? rule.value : `"${(rule.value ?? '').replace(/["\\]/g, '\\$&')}"`}`).join(' and ');
}

export function parseSort(text: string | undefined): SortRule[] {
  return (text ?? '').split(',').map(part => part.trim().split(':')).filter(([property]) => property && word.test(property))
    .map(([property, direction]) => ({ property, direction: direction === 'desc' ? 'desc' : 'asc' }));
}
export const writeSort = (rules: readonly SortRule[]) => rules.map(rule => `${rule.property}:${rule.direction}`).join(',');

const titleProperty: Property = { id: 'title', name: 'Nom', type: 'text', options: [] };
const cell = (row: QueryRow, property: Property): CellValue => property.id === 'title' ? row.title || null : readCell(property, row.values?.[property.id]) ?? null;
const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('fr');

function matches(value: CellValue, rule: FilterRule, property: Property, today: string): boolean {
  const empty = value === null || (Array.isArray(value) && !value.length);
  if (rule.op === 'is empty') return empty;
  if (rule.op === 'is not empty') return !empty;
  // A rule still being written (no value yet) shows every row, as in Notion.
  if (!rule.value) return true;
  const wanted = property.type === 'date' && rule.value === 'today' ? today : rule.value ?? '';
  if (property.type === 'checkbox') return (value === true) === (wanted === 'true');
  if (Array.isArray(value) || property.type === 'multi-select') {
    const has = (value as string[] | null ?? []).some(item => fold(item) === fold(wanted));
    return rule.op === 'not contains' ? !has : rule.op === 'contains' ? has : false;
  }
  if (rule.op === 'contains' || rule.op === 'not contains') return (value !== null && fold(String(value)).includes(fold(wanted))) === (rule.op === 'contains');
  if (property.type === 'number' && (value === null || !Number.isFinite(Number(wanted)))) return rule.op === '!=';
  if (value === null) return rule.op === '!=';
  const order = property.type === 'number' ? Math.sign(Number(value) - Number(wanted)) : property.type === 'date' ? Math.sign(String(value).slice(0, 10).localeCompare(wanted.slice(0, 10))) : fold(String(value)) === fold(wanted) ? 0 : 1;
  switch (rule.op) {
    case '=': return order === 0;
    case '!=': return order !== 0;
    case '<': return order < 0;
    case '>': return order > 0;
    case '<=': return order <= 0;
    default: return order >= 0;
  }
}

function compare(a: CellValue, b: CellValue, property: Property): number {
  if (property.type === 'select' || property.type === 'status') {
    const names = property.options.map(o => o.name);
    return names.indexOf(String(a)) - names.indexOf(String(b));
  }
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' || typeof b === 'boolean') return Number(a === true) - Number(b === true);
  return String(a).localeCompare(String(b), 'fr', { numeric: true, sensitivity: 'base' });
}

/**
 * Rows a view shows, in its order. Unknown properties in a rule are ignored (the rule stays in the file);
 * empty values sort last in both directions, as in Notion. `search` matches the title and text values.
 */
export function queryRows<T extends QueryRow>(rows: readonly T[], properties: readonly Property[], view: { filter?: readonly FilterRule[]; sort?: readonly SortRule[]; search?: string; today?: string }): T[] {
  const find = (id: string) => id === 'title' ? titleProperty : properties.find(p => p.id === id);
  const today = view.today ?? new Date().toISOString().slice(0, 10);
  const search = fold(view.search?.trim() ?? '');
  const shown = rows.filter(row => (view.filter ?? []).every(rule => { const property = find(rule.property); return !property || matches(cell(row, property), rule, property, today); })
    && (!search || [titleProperty, ...properties].some(p => { const value = cell(row, p); return value !== null && typeof value !== 'boolean' && fold(Array.isArray(value) ? value.join(' ') : String(value)).includes(search); })));
  const sorts = (view.sort ?? []).flatMap(rule => { const property = find(rule.property); return property ? [{ property, sign: rule.direction === 'desc' ? -1 : 1 }] : []; });
  if (!sorts.length) return shown;
  return shown.map((row, index) => ({ row, index })).sort((x, y) => {
    for (const { property, sign } of sorts) {
      const a = cell(x.row, property), b = cell(y.row, property);
      const aEmpty = a === null || (Array.isArray(a) && !a.length), bEmpty = b === null || (Array.isArray(b) && !b.length);
      if (aEmpty || bEmpty) { if (aEmpty !== bEmpty) return aEmpty ? 1 : -1; continue; }
      const order = compare(a, b, property) * sign;
      if (order) return order;
    }
    return x.index - y.index;
  }).map(entry => entry.row);
}
