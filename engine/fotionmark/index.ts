// FotionMark: the Markdown superset of Fotion. Standalone — no editor, DOM or package dependency.
// Layers: syntax (directives) → tree (parse/stringify) → schema (types, registry, validation) → blocks (declarations).
import { validate as validateWith, validateNode as validateNodeWith, type Diagnostic } from './schema/validate';
import type { FotionNode, BlockNode } from './tree/document';
import { blocks } from './blocks';

export { parseDirective, parseAttributes, serializeAttributes, serializeContainer, serializeLeaf, directiveStart, type Directive, type Container, type Leaf, type Attributes } from './syntax/directives';
export { parse, parseBlocks, stringify, stringifyBlocks, type FotionDocument, type FotionNode, type MarkdownNode, type BlockNode, type LeafNode } from './tree/document';
export { readValue, writeValue, readAttributes, writeAttributes, type AttributeType, type AttributeTypes, type Value } from './schema/attributes';
export { defineBlock, type BlockDefinition, type Content } from './schema/define-block';
export { createRegistry, type Registry } from './schema/registry';
export { hasErrors, type Diagnostic } from './schema/validate';
export { blocks } from './blocks';
export { propertyTypes, reservedKeys, defaultStatusOptions, readDatabase, readCell, writeCell, newPropertyId, nextOptionColor, updateProperty, addProperty, removeProperty, convertValue, optionNames, newDatabase, newBoardDatabase, type PropertyType, type PropertyOption, type Property, type CellValue, type DatabaseReading } from './database/properties';

/** Validates a tree against the built-in registry. */
export const validate = (nodes: FotionNode[], registry = blocks): Diagnostic[] => validateWith(nodes, registry);
/** Validates one block (not its descendants) against the built-in registry. */
export const validateNode = (node: Exclude<FotionNode, { type: 'markdown' }>, parent?: BlockNode, registry = blocks): Diagnostic[] => validateNodeWith(node, registry, parent);
