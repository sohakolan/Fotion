import { defineBlock } from '../schema/define-block';

/**
 * A view of a database (docs/FOTIONMARK.md, « Bases de données »). Without `src` it shows the database of
 * the page that contains it (full-page database); with `src`, a database stored in another page (inline or linked view).
 * The label is the view's name. Only the table layout exists in v1; other layouts are additive values.
 */
export const databaseView = defineBlock({
  name: 'database-view', form: 'leaf', version: 1,
  description: 'Vue d’une base de données : ses lignes sont des pages.',
  attributes: { src: { type: 'page' }, layout: { type: 'enum', values: ['table'], default: 'table' } },
});
