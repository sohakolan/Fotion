import { Table as BaseTable } from '@tiptap/extension-table';
import { DOMSerializer, type Schema } from '@tiptap/pm/model';

export function tableExtension() {
  let schema: Schema | undefined;
  return BaseTable.extend({
    onBeforeCreate() { schema = this.editor.schema; },
    parseHTML() { return [{ tag: 'table[data-fotion-table]', preserveWhitespace: 'full' }, ...(this.parent?.() || [])]; },
    renderMarkdown(node, helpers, context) {
      const rows = node.content || [];
      const simple = rows.length > 0 && rows.every((row, rowIndex) => row.content?.every((cell, columnIndex) => {
        const attrs = cell.attrs || {};
        const columnAlign = rows[0].content?.[columnIndex].attrs?.align || null;
        const paragraph = cell.content?.[0];
        return cell.type === (rowIndex === 0 ? 'tableHeader' : 'tableCell')
          && !attrs.colwidth && (attrs.colspan ?? 1) === 1 && (attrs.rowspan ?? 1) === 1
          && (attrs.align || null) === columnAlign
          && cell.content?.length === 1 && paragraph?.type === 'paragraph'
          && (paragraph.content || []).every(child => ['text', 'pageMention'].includes(child.type || '') && !/[\r\n\t]|\s{2}/.test(child.text || ''))
          && !/^\s|\s$/.test((paragraph.content || []).map(child => child.text || '').join(''));
      }));
      if (simple) return this.parent?.(node, helpers, context) || '';
      if (!schema) throw new Error('Le schéma du tableau n’est pas initialisé.');
      const element = DOMSerializer.fromSchema(schema).serializeNode(schema.nodeFromJSON(node)) as HTMLElement;
      // A single HTML block must not terminate at blank lines inside a cell's code or text.
      return element.outerHTML.replace(/\n/g, '&#10;');
    },
  }).configure({ HTMLAttributes: { 'data-fotion-table': '' }, resizable: true, cellMinWidth: 60, lastColumnResizable: true });
}
