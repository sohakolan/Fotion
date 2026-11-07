import { defineBlock } from '../schema/define-block.ts';

/** Notion's « Link to page » block: a full-width link to another page of the vault. */
export const linkToPage = defineBlock({
  name: 'link-to-page', form: 'leaf', version: 1,
  description: 'Lien vers une autre page, affiché comme un bloc.',
  attributes: { page: { type: 'page' } },
});
