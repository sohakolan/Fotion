import { readValue } from '../schema/attributes';

/**
 * FotionMark databases (docs/FOTIONMARK.md, « Bases de données »).
 * A database is a page whose front matter holds `database: { properties: [...] }`; each row is a page
 * whose `parent` is that database and whose values are top-level YAML keys named by the property `id`.
 * Everything here works on plain YAML values and keeps what it does not understand.
 */

export const propertyTypes = ['text', 'number', 'select', 'multi-select', 'status', 'date', 'checkbox', 'url', 'email', 'phone'] as const;
export type PropertyType = typeof propertyTypes[number];
export interface PropertyOption { name: string; color: string; group?: 'todo' | 'doing' | 'done' }
export interface Property { id: string; name: string; type: PropertyType; options: PropertyOption[] }
/** Empty is null; a value of the wrong type reads as undefined and stays untouched in the file. */
export type CellValue = string | number | boolean | string[] | null;

/** Front matter keys owned by the page itself; a property can never use them. */
export const reservedKeys = ['title', 'icon', 'parent', 'favorite', 'cover', 'trashed', 'order', 'fullWidth', 'smallText', 'font', 'locked', 'backlinks', 'database', 'fotionmark', 'template'] as const;
const propertyId = /^[a-z][a-z0-9-]{0,63}$/;
const optionColors = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Notion's default status options and groups, in French. */
export const defaultStatusOptions: PropertyOption[] = [
  { name: 'Pas commencé', color: 'gray', group: 'todo' },
  { name: 'En cours', color: 'blue', group: 'doing' },
  { name: 'Terminé', color: 'green', group: 'done' },
];

export interface DatabaseReading { properties: Property[]; problems: string[] }

/** Reads `database` from front matter; undefined when the page is not a database. Invalid properties are skipped, reported, and kept in the file. */
export function readDatabase(raw: unknown): DatabaseReading | undefined {
  if (!record(raw) || !Array.isArray(raw.properties)) return undefined;
  const properties: Property[] = [], problems: string[] = [], seen = new Set<string>();
  raw.properties.forEach((entry, index) => {
    const where = `Propriété ${index + 1}`;
    if (!record(entry) || typeof entry.id !== 'string' || !propertyId.test(entry.id) || (reservedKeys as readonly string[]).includes(entry.id)) return problems.push(`${where} : identifiant invalide ou réservé.`);
    if (seen.has(entry.id)) return problems.push(`${where} : identifiant « ${entry.id} » en double.`);
    if (!(propertyTypes as readonly string[]).includes(entry.type as string)) return problems.push(`${where} : type « ${String(entry.type)} » inconnu.`);
    seen.add(entry.id);
    const options = Array.isArray(entry.options) ? entry.options.filter(record).filter(o => typeof o.name === 'string' && o.name).map(o => ({ name: o.name as string, color: optionColors.includes(o.color as string) ? o.color as string : 'default', ...(['todo', 'doing', 'done'].includes(o.group as string) ? { group: o.group as PropertyOption['group'] } : {}) })) : [];
    const type = entry.type as PropertyType;
    properties.push({ id: entry.id, name: typeof entry.name === 'string' && entry.name ? entry.name : entry.id, type, options: type === 'status' && !options.length ? defaultStatusOptions : options });
  });
  return { properties, problems };
}

/** Typed value of a row cell: null when empty, undefined when the stored value does not fit the type. */
export function readCell(property: Property, value: unknown): CellValue | undefined {
  if (value === undefined || value === null || value === '') return null;
  switch (property.type) {
    case 'number': return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
    case 'checkbox': return typeof value === 'boolean' ? value : undefined;
    case 'multi-select': {
      const list = Array.isArray(value) ? value : [value];
      return list.every(item => typeof item === 'string') ? list as string[] : undefined;
    }
    case 'date': return typeof value === 'string' && readValue({ type: 'date' }, value) !== undefined ? value : undefined;
    default: return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined;
  }
}

/** YAML value to store for a user input; undefined means « remove the key » (empty cell). */
export function writeCell(property: Property, input: string | boolean | string[]): unknown {
  if (property.type === 'checkbox') return input === true ? true : undefined;
  if (property.type === 'multi-select') {
    const list = (Array.isArray(input) ? input : String(input).split(',')).map(item => item.trim()).filter(Boolean);
    return list.length ? [...new Set(list)] : undefined;
  }
  const text = String(input).trim();
  if (!text) return undefined;
  if (property.type === 'number') { const number = Number(text.replace(',', '.')); return Number.isFinite(number) ? number : undefined; }
  if (property.type === 'date') return readValue({ type: 'date' }, text) !== undefined ? text : undefined;
  return text;
}

/** A free property id derived from its name: `Échéance` → `echeance`, then `echeance-2`… */
export function newPropertyId(name: string, taken: readonly string[]): string {
  const base = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/^[^a-z]+/, '').slice(0, 56) || 'propriete';
  const used = new Set([...taken, ...reservedKeys]);
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  return id;
}

/** Next option colour, cycling through Notion's palette in order. */
export const nextOptionColor = (options: readonly PropertyOption[]) => optionColors[options.length % optionColors.length];

/** Returns new front matter `database` with one property changed; other properties and unknown keys are kept. */
export function updateProperty(raw: unknown, id: string, patch: Partial<Omit<Property, 'id'>>): Record<string, unknown> {
  const base = record(raw) ? raw : {};
  const properties = Array.isArray(base.properties) ? base.properties : [];
  return { ...base, properties: properties.map(entry => record(entry) && entry.id === id ? { ...entry, ...patch } : entry) };
}

/** Returns new front matter `database` with a property appended. */
export function addProperty(raw: unknown, property: Omit<Property, 'options'> & { options?: PropertyOption[] }): Record<string, unknown> {
  const base = record(raw) ? raw : {};
  const { options, ...rest } = property;
  return { ...base, properties: [...(Array.isArray(base.properties) ? base.properties : []), options?.length ? { ...rest, options } : rest] };
}

/** Front matter of a new database, as Notion creates it: a title column (the page title) and « Étiquettes ». */
export const newDatabase = () => ({ properties: [{ id: 'tags', name: 'Étiquettes', type: 'multi-select' }] });
