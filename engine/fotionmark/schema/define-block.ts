import type { AttributeTypes } from './attributes.ts';

/** Content model of a container: plain FotionMark, or only some blocks. */
export type Content = { kind: 'markdown' } | { kind: 'blocks'; blocks: readonly string[]; min?: number; max?: number };

/**
 * Single source of truth for a FotionMark block. The interpreter validates with it,
 * the editor generates its node from it and the UI looks up the view by `name`.
 */
export interface BlockDefinition {
  /** kebab-case, unique, never renamed once released. */
  name: string;
  form: 'container' | 'leaf';
  /** Bumped only with a migration; see docs/FOTIONMARK.md. */
  version: number;
  description: string;
  attributes: AttributeTypes;
  /** Containers only. */
  content?: Content;
  /** The block is only valid directly inside this parent. */
  parent?: string;
}

export function defineBlock<const T extends BlockDefinition>(definition: T): Readonly<T> {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(definition.name)) throw new Error(`Nom de bloc FotionMark invalide : ${definition.name}`);
  if ((definition.form === 'container') !== (definition.content !== undefined)) throw new Error(`« ${definition.name} » : seul un conteneur déclare un contenu`);
  if ('id' in definition.attributes) throw new Error(`« ${definition.name} » : « id » est réservé à tous les blocs`);
  return Object.freeze(definition);
}
