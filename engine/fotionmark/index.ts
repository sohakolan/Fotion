// FotionMark: the Markdown superset of Fotion. Standalone — no editor, DOM or package dependency.
// Layers: syntax (directives) → tree (parse/stringify) → schema (types, registry, validation) → blocks (declarations).
import { validate as validateWith, validateNode as validateNodeWith, type Diagnostic } from './schema/validate.ts';
import type { FotionNode, BlockNode } from './tree/document.ts';
import { blocks } from './blocks/index.ts';

export { parseDirective, parseAttributes, serializeAttributes, serializeContainer, serializeLeaf, directiveStart, type Directive, type Container, type Leaf, type Attributes } from './syntax/directives.ts';
export { parse, parseBlocks, stringify, stringifyBlocks, type FotionDocument, type FotionNode, type MarkdownNode, type BlockNode, type LeafNode } from './tree/document.ts';
export { readValue, writeValue, readAttributes, writeAttributes, type AttributeType, type AttributeTypes, type Value } from './schema/attributes.ts';
export { defineBlock, type BlockDefinition, type Content } from './schema/define-block.ts';
export { createRegistry, type Registry } from './schema/registry.ts';
export { hasErrors, type Diagnostic } from './schema/validate.ts';
export { blocks } from './blocks/index.ts';
export { propertyTypes, reservedKeys, defaultStatusOptions, readDatabase, readCell, writeCell, newPropertyId, nextOptionColor, updateProperty, addProperty, removeProperty, convertValue, optionNames, newDatabase, newBoardDatabase, type PropertyType, type PropertyOption, type Property, type CellValue, type DatabaseReading } from './database/properties.ts';
export { operators, operatorsFor, parseFilter, writeFilter, parseSort, writeSort, queryRows, type Operator, type FilterRule, type SortRule, type QueryRow } from './database/query.ts';

/** Validates a tree against the built-in registry. */
export const validate = (nodes: FotionNode[], registry = blocks): Diagnostic[] => validateWith(nodes, registry);
/** Validates one block (not its descendants) against the built-in registry. */
export const validateNode = (node: Exclude<FotionNode, { type: 'markdown' }>, parent?: BlockNode, registry = blocks): Diagnostic[] => validateNodeWith(node, registry, parent);
