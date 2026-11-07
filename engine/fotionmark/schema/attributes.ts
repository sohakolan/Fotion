import type { Attributes } from '../syntax/directives';

/**
 * Typed attribute declarations. Files store strings; blocks read typed values.
 * Conventions: camelCase keys, a default for every optional value, defaults never written.
 */
export type AttributeType =
  | { type: 'string'; default?: string; maxLength?: number }
  | { type: 'enum'; values: readonly string[]; default?: string }
  | { type: 'number'; default?: number; min?: number; max?: number; integer?: boolean }
  | { type: 'boolean'; default?: boolean }
  | { type: 'percent'; default?: number }
  | { type: 'url'; default?: string }
  | { type: 'page'; default?: string }
  | { type: 'date'; default?: string }
  /** A web address or a file imported into the vault (`attachments/…`). */
  | { type: 'source'; default?: string };
export type AttributeTypes = Record<string, AttributeType>;
export type Value = string | number | boolean;

/** Returns the typed value, or undefined when the text is not valid for the type. */
export function readValue(type: AttributeType, text: string): Value | undefined {
  switch (type.type) {
    case 'string': return type.maxLength === undefined || text.length <= type.maxLength ? text : undefined;
    case 'enum': return type.values.includes(text) ? text : undefined;
    case 'number': {
      const value = Number(text);
      return text.trim() !== '' && Number.isFinite(value) && (!type.integer || Number.isInteger(value)) && (type.min === undefined || value >= type.min) && (type.max === undefined || value <= type.max) ? value : undefined;
    }
    case 'boolean': return text === '' || text === 'true' ? true : text === 'false' ? false : undefined;
    case 'percent': { const match = text.match(/^(\d{1,3}(?:\.\d+)?)%$/); const value = match ? Number(match[1]) : NaN; return value > 0 && value < 100 ? value : undefined; }
    case 'url': return /^(https?:\/\/|mailto:)[^\s]+$/i.test(text) ? text : undefined;
    case 'page': return /^[^/\\:\x00-\x1f]{1,220}\.md$/.test(text) && !text.startsWith('.') ? text : undefined;
    case 'source': return /^https?:\/\/[^\s]+$/i.test(text) || /^attachments\/[^/\\\s.][^/\\\s]{0,199}$/.test(text) ? text : undefined;
    case 'date': return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})?)?$/.test(text) && !Number.isNaN(Date.parse(text)) && new Date(`${text.slice(0, 10)}T00:00:00Z`).toISOString().startsWith(text.slice(0, 10)) ? text : undefined;
  }
}

export function writeValue(type: AttributeType, value: Value): string {
  if (type.type === 'percent') return `${value}%`;
  if (type.type === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

/** Typed view of stored attributes; invalid or missing values fall back to defaults. Unknown keys are ignored here and preserved by the tree. */
export function readAttributes(types: AttributeTypes, stored: Attributes): Record<string, Value | undefined> {
  return Object.fromEntries(Object.entries(types).map(([key, type]) => [key, stored[key] !== undefined ? readValue(type, stored[key]) ?? type.default : type.default]));
}

/** Writes typed values back, omitting defaults and undefined values; unknown stored keys are kept as they were. */
export function writeAttributes(types: AttributeTypes, values: Record<string, Value | undefined>, stored: Attributes = {}): Attributes {
  const result: Attributes = Object.fromEntries(Object.entries(stored).filter(([key]) => !(key in types)));
  for (const [key, type] of Object.entries(types)) {
    const value = values[key];
    if (value !== undefined && value !== type.default) result[key] = writeValue(type, value);
  }
  return result;
}
