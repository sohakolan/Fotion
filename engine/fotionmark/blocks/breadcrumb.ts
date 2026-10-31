import { defineBlock } from '../schema/define-block';

/** Notion's breadcrumb block: the path from the workspace to the page holding it, computed when shown. */
export const breadcrumb = defineBlock({
  name: 'breadcrumb', form: 'leaf', version: 1,
  description: 'Chemin de la page dans l’arborescence.',
  attributes: {},
});
