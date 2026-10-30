/**
 * FotionMark v1 — the Markdown layer for blocks that CommonMark/GFM cannot express.
 * Pure string functions: no editor, no DOM, no dependency. See docs/FOTIONMARK.md.
 *
 *   :::name[label]{key=value key="quoted value"}   container (body is FotionMark)
 *   :::
 *   ::name[label]{key=value}                        leaf (single line)
 */
export type Attributes = Record<string, string>;
export interface Container { kind: 'container'; name: string; label?: string; attributes: Attributes; body: string; raw: string }
export interface Leaf { kind: 'leaf'; name: string; label?: string; attributes: Attributes; raw: string }
export type Directive = Container | Leaf;

const NAME = '([A-Za-z][\\w-]*)';
const LABEL = '(?:\\[([^\\]\\n]*)\\])?';
const ATTRS = '(\\{[^}\\n]*\\})?';
const opening = new RegExp(`^(:{3,})${NAME}${LABEL}${ATTRS}[ \\t]*(?:\\n|$)`);
const leaf = new RegExp(`^::${NAME}${LABEL}${ATTRS}[ \\t]*(?:\\n|$)`);
const codeFence = /^ {0,3}(`{3,}|~{3,})/;

/** Parses `{a=1 b="two words" flag}`; values may be single- or double-quoted with backslash escapes. */
export function parseAttributes(source = ''): Attributes {
  const result: Attributes = {};
  const inner = source.replace(/^\{|\}$/g, '');
  const pattern = /([A-Za-z_][\w-]*)(?:=("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s"'}]+))?/g;
  for (const [, key, value] of inner.matchAll(pattern)) {
    result[key] = value === undefined ? '' : /^["']/.test(value) ? value.slice(1, -1).replace(/\\(.)/g, '$1') : value;
  }
  return result;
}

export function serializeAttributes(attributes: Attributes): string {
  const parts = Object.entries(attributes).filter(([key]) => /^[A-Za-z_][\w-]*$/.test(key)).map(([key, value]) =>
    value === '' ? key : /^[^\s"'{}=]+$/.test(value) ? `${key}=${value}` : `${key}="${value.replace(/["\\]/g, '\\$&')}"`);
  return parts.length ? `{${parts.join(' ')}}` : '';
}

/** Reads a directive at the very start of `source`, or returns null. */
export function parseDirective(source: string): Directive | null {
  const single = source.match(leaf);
  if (single) return { kind: 'leaf', name: single[1], label: single[2], attributes: parseAttributes(single[3]), raw: single[0].replace(/\n$/, '') };
  const open = source.match(opening);
  if (!open) return null;
  const fence = open[1];
  const lines = source.slice(open[0].length).split('\n');
  let depth = 1, offset = open[0].length, code: string | undefined;
  for (const line of lines) {
    const marker = line.match(codeFence);
    if (code) { if (marker && marker[1][0] === code[0] && marker[1].length >= code.length && !line.slice(marker[0].length).trim()) code = undefined; }
    else if (marker) code = marker[1];
    // Only fences of the same length open or close this container; other lengths are nested content.
    else if (line.match(/^(:{3,})[A-Za-z]/)?.[1] === fence) depth++;
    else if (line.trimEnd() === fence && --depth === 0) {
      const raw = source.slice(0, offset + line.length);
      return { kind: 'container', name: open[2], label: open[3], attributes: parseAttributes(open[4]), body: source.slice(open[0].length, offset).replace(/\n$/, ''), raw };
    }
    offset += line.length + 1;
  }
  return null;
}

/** Index of the first line that may start a directive, for Markdown block lexers. */
export function directiveStart(source: string) {
  const match = source.match(/(?:^|\n)(:{2,}[A-Za-z])/);
  return match ? match.index! + (match[0].startsWith('\n') ? 1 : 0) : -1;
}

const head = (name: string, label: string | undefined, attributes: Attributes) => `${name}${label !== undefined ? `[${label}]` : ''}${serializeAttributes(attributes)}`;

/** Writes a container; its fence is longer than any container fence inside the body, as in remark-directive. */
export function serializeContainer(name: string, attributes: Attributes, body: string, label?: string) {
  let inner = 2, code: string | undefined;
  for (const line of body.split('\n')) {
    const marker = line.match(codeFence);
    if (code) { if (marker && marker[1][0] === code[0] && marker[1].length >= code.length && !line.slice(marker[0].length).trim()) code = undefined; }
    else if (marker) code = marker[1];
    else inner = Math.max(inner, line.match(/^(:{3,})[A-Za-z]/)?.[1].length ?? 0);
  }
  const fence = ':'.repeat(inner + 1);
  return `${fence}${head(name, label, attributes)}\n${body}\n${fence}`;
}

export const serializeLeaf = (name: string, attributes: Attributes, label?: string) => `::${head(name, label, attributes)}`;
