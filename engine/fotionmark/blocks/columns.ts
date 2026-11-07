import { defineBlock } from '../schema/define-block.ts';

/** Notion columns: `::::columns` holding 2 to 5 `:::column` blocks. */
export const columns = defineBlock({
  name: 'columns', form: 'container', version: 1,
  description: 'Répartit des blocs côte à côte.',
  attributes: {},
  content: { kind: 'blocks', blocks: ['column'], min: 2, max: 5 },
});

export const column = defineBlock({
  name: 'column', form: 'container', version: 1, parent: 'columns',
  description: 'Une colonne ; sa largeur est un pourcentage de la ligne.',
  attributes: { width: { type: 'percent' } },
  content: { kind: 'markdown' },
});
