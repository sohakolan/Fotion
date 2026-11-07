import type { FotionNode, BlockNode } from '../tree/document.ts';
import type { Registry } from './registry.ts';
import { readValue } from './attributes.ts';

export interface Diagnostic { severity: 'error' | 'warning'; path: string; message: string }
const blockId = /^[a-z0-9][a-z0-9-]{0,63}$/;

/**
 * Checks a whole tree against the registry without changing it.
 * Errors mean the block cannot be shown and must be preserved verbatim; warnings are informative.
 */
export function validate(nodes: FotionNode[], registry: Registry, parent?: BlockNode, path = ''): Diagnostic[] {
  return nodes.flatMap((node, index) => {
    if (node.type === 'markdown') return [];
    const where = `${path}/${index}:${node.name}`;
    const own = validateNode(node, registry, parent, where);
    return node.type === 'block' && registry.has(node.name) ? [...own, ...validate(node.children, registry, node, where)] : own;
  });
}

/** Checks one block (attributes, placement, direct children) but not its descendants. */
export function validateNode(node: Exclude<FotionNode, { type: 'markdown' }>, registry: Registry, parent?: BlockNode, where = `/${node.name}`): Diagnostic[] {
  const out: Diagnostic[] = [];
  const error = (message: string) => out.push({ severity: 'error', path: where, message });
  const definition = registry.get(node.name);
  if (!definition) { error(`Bloc inconnu « ${node.name} »`); return out; }
  const container = node.type === 'block';
  if ((definition.form === 'container') !== container) error(`« ${node.name} » doit être ${definition.form === 'container' ? 'un conteneur :::' : 'une ligne ::'}`);
  if (definition.parent && parent?.name !== definition.parent) error(`« ${node.name} » doit être dans « ${definition.parent} »`);
  for (const [key, value] of Object.entries(node.attributes)) {
    if (key === 'id') { if (!blockId.test(value)) error(`Identifiant de bloc invalide : ${value}`); continue; }
    const type = definition.attributes[key];
    if (!type) out.push({ severity: 'warning', path: where, message: `Attribut inconnu conservé : ${key}` });
    else if (readValue(type, value) === undefined) error(`Valeur invalide pour ${key} : ${value}`);
  }
  if (!container || !definition.content) return out;
  const content = definition.content;
  if (content.kind === 'blocks') {
    const children = node.children.filter(child => child.type !== 'markdown');
    if (node.children.some(child => child.type === 'markdown')) error(`« ${node.name} » ne peut pas contenir de texte`);
    for (const child of children) if (!content.blocks.includes(child.name)) error(`« ${node.name} » ne peut pas contenir « ${child.name} »`);
    if (content.min !== undefined && children.length < content.min) error(`« ${node.name} » demande au moins ${content.min} éléments`);
    if (content.max !== undefined && children.length > content.max) error(`« ${node.name} » accepte au plus ${content.max} éléments`);
  }
  return out;
}

export const hasErrors = (diagnostics: Diagnostic[]) => diagnostics.some(diagnostic => diagnostic.severity === 'error');
