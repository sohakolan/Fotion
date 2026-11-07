import { defineBlock } from '../schema/define-block';

/**
 * A view of a database (docs/FOTIONMARK.md, « Bases de données »). Without `src` it shows the database of
 * the page that contains it (full-page database); with `src`, a database stored in another page (inline or linked view).
 * The label is the view's name. Layouts: `table`, `board` (Kanban grouped by `groupBy`, a select or status property id;
 * without it, the first one). Other layouts are additive values.
 */
export const databaseView = defineBlock({
  name: 'database-view', form: 'leaf', version: 1,
  description: 'Vue d’une base de données : ses lignes sont des pages.',
  attributes: { src: { type: 'page' }, layout: { type: 'enum', values: ['table', 'board'], default: 'table' }, groupBy: { type: 'string', maxLength: 64 } },
});
