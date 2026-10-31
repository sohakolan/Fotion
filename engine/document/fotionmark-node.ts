import { Node, type JSONContent, type MarkdownToken, type MarkdownLexerConfiguration } from '@tiptap/core';
import { parseDirective, parseBlocks, stringifyBlocks, validateNode, hasErrors, readAttributes, directiveStart, serializeContainer, serializeLeaf, type BlockDefinition, type BlockNode, type FotionNode, type Attributes, type Value } from '../fotionmark';

type Lexer = Pick<MarkdownLexerConfiguration, 'blockTokens'>;
type DirectiveToken = MarkdownToken & { attributes: Attributes; label?: string; tokens: MarkdownToken[] };

/** A block the editor can display, or the preserved directive token when FotionMark reports an error. */
export function toToken(node: Exclude<FotionNode, { type: 'markdown' }>, lexer: Lexer, parent?: BlockNode): DirectiveToken {
  const raw = stringifyBlocks([node]);
  if (hasErrors(validateNode(node, parent))) return { type: 'directiveBlock', raw, attributes: {}, tokens: [] };
  const tokens = node.type === 'block' ? node.children.flatMap(child => child.type === 'markdown' ? lexer.blockTokens(child.text) : [toToken(child, lexer, node)]) : [];
  return { type: node.name, raw, attributes: node.attributes, label: node.label, tokens };
}

/**
 * Editor node generated from a FotionMark declaration. Stored attributes are kept as-is (unknown keys
 * included) so a save never drops what a newer version wrote; views read typed values with readAttributes.
 * Blocks with a required parent have no tokenizer of their own: their parent reads them.
 */
export function fotionmarkNode(definition: BlockDefinition, editor: { content?: string; group?: string; isolating?: boolean; atom?: boolean; html?: (values: Record<string, Value | undefined>) => Record<string, string> } = {}) {
  const container = definition.form === 'container';
  const separator = definition.content?.kind === 'blocks' ? '\n' : '\n\n';
  return Node.create({
    name: definition.name,
    group: editor.group ?? (definition.parent ? undefined : 'block'),
    content: container ? editor.content ?? 'block+' : undefined,
    atom: !container || editor.atom,
    isolating: editor.isolating ?? container,
    defining: container,
    addAttributes: () => ({
      attributes: { default: {}, rendered: false, parseHTML: element => { try { return JSON.parse(element.getAttribute('data-attributes') || '{}'); } catch { return {}; } } },
      // The directive label (`:::name[label]`), e.g. a button's text; null when absent so it is never invented.
      label: { default: null, rendered: false, parseHTML: element => element.getAttribute('data-label') },
    }),
    parseHTML: () => [{ tag: `div[data-fotionmark="${definition.name}"]` }],
    renderHTML: ({ node }) => ['div', { 'data-fotionmark': definition.name, 'data-attributes': JSON.stringify(node.attrs.attributes), ...(node.attrs.label !== null ? { 'data-label': node.attrs.label } : {}), class: `fm-${definition.name}`, ...editor.html?.(readAttributes(definition.attributes, node.attrs.attributes)) }, ...(container ? [0] : [])],
    ...(definition.parent ? {} : {
      markdownTokenizer: {
        name: definition.name, level: 'block' as const, start: directiveStart,
        tokenize(source: string, _tokens: MarkdownToken[], lexer: MarkdownLexerConfiguration) {
          const directive = parseDirective(source);
          if (directive?.name !== definition.name) return;
          const [node] = parseBlocks(directive.raw);
          if (node?.type === 'markdown') return;
          const token = toToken(node, lexer);
          return token.type === definition.name ? { ...token, raw: directive.raw } : undefined;
        },
      },
    }),
    parseMarkdown(token, helpers) {
      const children = container ? helpers.parseChildren(token.tokens || []) : [];
      const content = container && !children.length && definition.content?.kind === 'markdown' ? [{ type: 'paragraph' }] : children;
      return helpers.createNode(definition.name, { attributes: token.attributes || {}, label: token.label ?? null }, container ? content : undefined);
    },
    renderMarkdown(node: JSONContent, helpers) {
      const attributes = (node.attrs?.attributes || {}) as Attributes, label = node.attrs?.label ?? undefined;
      return container ? serializeContainer(definition.name, attributes, helpers.renderChildren(node.content || [], separator), label) : serializeLeaf(definition.name, attributes, label);
    },
  });
}
