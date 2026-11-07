import type { BlockDefinition } from './define-block.ts';

export type Registry = ReadonlyMap<string, BlockDefinition>;

/** Builds the block registry and checks that every reference between blocks exists. */
export function createRegistry(definitions: readonly BlockDefinition[]): Registry {
  const registry = new Map<string, BlockDefinition>();
  for (const definition of definitions) {
    if (registry.has(definition.name)) throw new Error(`Bloc FotionMark déclaré deux fois : ${definition.name}`);
    registry.set(definition.name, definition);
  }
  for (const definition of definitions) {
    const references = [...(definition.parent ? [definition.parent] : []), ...(definition.content?.kind === 'blocks' ? definition.content.blocks : [])];
    for (const name of references) if (!registry.has(name)) throw new Error(`« ${definition.name} » référence un bloc inconnu : ${name}`);
  }
  return registry;
}
