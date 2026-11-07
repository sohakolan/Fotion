import { defineBlock } from '../schema/define-block.ts';

/**
 * Notion's button block, « Insérer des blocs » action: the label is the button text, the body is the
 * template copied below the button on each click.
 *   :::button[Nouvelle tâche]
 *   - [ ] À faire
 *   :::
 */
export const button = defineBlock({
  name: 'button', form: 'container', version: 1,
  description: 'Bouton qui insère une copie de son modèle en dessous.',
  attributes: {},
  content: { kind: 'markdown' },
});
