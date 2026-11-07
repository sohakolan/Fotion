import { defineBlock } from '../schema/define-block.ts';

/** Children of the preceding block, shown indented (Notion's Tab on any block). */
export const indent = defineBlock({
  name: 'indent', form: 'container', version: 1,
  description: 'Blocs imbriqués sous le bloc précédent.',
  attributes: {},
  content: { kind: 'markdown' },
});
