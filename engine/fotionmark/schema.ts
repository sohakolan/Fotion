import type { FotionNode, BlockNode } from './document';

/** What a FotionMark block may contain and which attributes it understands. */
export interface BlockDefinition {
  kind: 'block' | 'leaf';
  /** Allowed child block names; `markdown` allows plain Markdown runs. Omitted for leaves. */
  children?: string[];
  minChildren?: number;
  attributes?: Record<string, (value: string) => boolean>;
  /** Parent block required, e.g. `column` only inside `columns`. */
  parent?: string;
}

const percent = (value: string) => /^\d{1,3}(?:\.\d+)?%$/.test(value) && parseFloat(value) > 0 && parseFloat(value) < 100;

/** FotionMark v1 vocabulary. New blocks are declared here first, then given an editor view. */
export const schema: Record<string, BlockDefinition> = {
  columns: { kind: 'block', children: ['column'], minChildren: 2 },
  column: { kind: 'block', parent: 'columns', children: ['markdown', '*'], attributes: { width: percent } },
};

export interface Diagnostic { path: string; message: string }

/** Lists problems without changing the tree: unknown or misplaced blocks are reported, never dropped. */
export function validate(nodes: FotionNode[], parent?: BlockNode, path = ''): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  nodes.forEach((node, index) => {
    if (node.type === 'markdown') return;
    const where = `${path}/${index}:${node.name}`;
    const definition = schema[node.name];
    if (!definition) { diagnostics.push({ path: where, message: `Bloc inconnu « ${node.name} »` }); return; }
    if (definition.kind !== (node.type === 'block' ? 'block' : 'leaf')) diagnostics.push({ path: where, message: `« ${node.name} » doit être ${definition.kind === 'block' ? 'un conteneur :::' : 'une ligne ::'}` });
    if (definition.parent && parent?.name !== definition.parent) diagnostics.push({ path: where, message: `« ${node.name} » doit être dans « ${definition.parent} »` });
    for (const [key, value] of Object.entries(node.attributes)) {
      const check = definition.attributes?.[key];
      if (check && !check(value)) diagnostics.push({ path: where, message: `Valeur invalide pour ${key} : ${value}` });
    }
    if (node.type === 'block') {
      const allowed = definition.children || [];
      const children = node.children.filter(child => child.type !== 'markdown' || allowed.includes('markdown'));
      if (!allowed.includes('*')) for (const child of node.children) {
        if (child.type === 'markdown' ? !allowed.includes('markdown') : !allowed.includes(child.name)) diagnostics.push({ path: where, message: `« ${node.name} » ne peut pas contenir ${child.type === 'markdown' ? 'du texte' : `« ${child.name} »`}` });
      }
      if (definition.minChildren && children.length < definition.minChildren) diagnostics.push({ path: where, message: `« ${node.name} » demande au moins ${definition.minChildren} éléments` });
      diagnostics.push(...validate(node.children, node, where));
    }
  });
  return diagnostics;
}
