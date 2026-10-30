import { parseDirective, serializeContainer, serializeLeaf, type Attributes } from '../syntax/directives';

/** FotionMark tree: plain Markdown is kept as text, FotionMark blocks become nodes. */
export interface MarkdownNode { type: 'markdown'; text: string }
export interface BlockNode { type: 'block'; name: string; label?: string; attributes: Attributes; children: FotionNode[] }
export interface LeafNode { type: 'leaf'; name: string; label?: string; attributes: Attributes }
export type FotionNode = MarkdownNode | BlockNode | LeafNode;
export interface FotionDocument { frontmatter?: string; children: FotionNode[] }

const codeFence = /^ {0,3}(`{3,}|~{3,})/;

/** Splits a body into Markdown runs and FotionMark blocks; directives inside code fences stay text. */
export function parseBlocks(source: string): FotionNode[] {
  const nodes: FotionNode[] = [];
  let text: string[] = [], code: string | undefined, rest = source;
  const flush = () => { const value = text.join('\n').replace(/^\n+|\n+$/g, ''); if (value) nodes.push({ type: 'markdown', text: value }); text = []; };
  while (rest.length) {
    const end = rest.indexOf('\n'), line = end < 0 ? rest : rest.slice(0, end);
    const marker = line.match(codeFence);
    if (code) { if (marker && marker[1][0] === code[0] && marker[1].length >= code.length && !line.slice(marker[0].length).trim()) code = undefined; }
    else if (marker) code = marker[1];
    else {
      const directive = /^:{2,}[A-Za-z]/.test(line) ? parseDirective(rest) : null;
      if (directive) {
        flush();
        nodes.push(directive.kind === 'leaf'
          ? { type: 'leaf', name: directive.name, label: directive.label, attributes: directive.attributes }
          : { type: 'block', name: directive.name, label: directive.label, attributes: directive.attributes, children: parseBlocks(directive.body) });
        rest = rest.slice(directive.raw.length).replace(/^\n/, '');
        continue;
      }
    }
    text.push(line);
    rest = end < 0 ? '' : rest.slice(end + 1);
  }
  flush();
  return nodes;
}

/** Parses a whole page: optional `---` YAML front matter (kept raw) and the FotionMark body. */
export function parse(source: string): FotionDocument {
  const front = source.match(/^---\n([\s\S]*?)\n---\n?/);
  return { ...(front ? { frontmatter: front[1] } : {}), children: parseBlocks(front ? source.slice(front[0].length) : source) };
}

export function stringifyBlocks(nodes: FotionNode[]): string {
  // Adjacent FotionMark blocks sit on consecutive lines; Markdown runs keep a blank line around them.
  return nodes.map((node, index) => {
    const text = node.type === 'markdown' ? node.text
      : node.type === 'leaf' ? serializeLeaf(node.name, node.attributes, node.label)
      : serializeContainer(node.name, node.attributes, stringifyBlocks(node.children), node.label);
    return index === 0 ? text : (node.type === 'markdown' || nodes[index - 1].type === 'markdown' ? '\n\n' : '\n') + text;
  }).join('');
}

export function stringify(document: FotionDocument): string {
  const body = stringifyBlocks(document.children);
  return document.frontmatter !== undefined ? `---\n${document.frontmatter}\n---\n\n${body}` : body;
}
