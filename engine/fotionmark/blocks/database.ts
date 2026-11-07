import { defineBlock } from '../schema/define-block';

/**
 * A view of a database (docs/FOTIONMARK.md, « Bases de données »). Without `src` it shows the database of
 * the page that contains it (full-page database); with `src`, a database stored in another page (inline or linked view).
 * The label is the view's name. Layouts: `table`, `board`, `list`, `gallery` (Kanban grouped by `groupBy`, a select or status property id;
 * without it, the first one). `filter` and `sort` are written by database/query.ts; `properties` lists the visible property ids in order (absent: all). Other layouts are additive values.
 */
export const databaseView = defineBlock({
  name: 'database-view', form: 'leaf', version: 1,
  description: 'Vue d’une base de données : ses lignes sont des pages.',
  attributes: { src: { type: 'page' }, layout: { type: 'enum', values: ['table', 'board', 'list', 'gallery'], default: 'table' }, groupBy: { type: 'string', maxLength: 64 }, filter: { type: 'string', maxLength: 2000 }, sort: { type: 'string', maxLength: 500 }, properties: { type: 'string', maxLength: 2000 } },
});
