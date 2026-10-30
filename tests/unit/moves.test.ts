import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorState } from '@tiptap/pm/state';
import { getSchema } from '@tiptap/core';
import { history, undo } from '@tiptap/pm/history';
import { documentExtensions as editorExtensions } from '../../engine';
import { moveBlockTransaction, blockAt } from '../../engine/operations/block-move';
import { planPageMove } from '../../engine/pages/page-move';
import type { Page } from '../../engine/models/page';
const schema = getSchema(editorExtensions());
const p = (text: string) => schema.nodes.paragraph.create(null, schema.text(text));
const li = (text: string) => schema.nodes.listItem.create(null, p(text));
const task = (text: string, checked: boolean) => schema.nodes.taskItem.create({ checked }, p(text));
const state = (...nodes: ReturnType<typeof p>[]) => EditorState.create({ schema, doc: schema.nodes.doc.create(null, nodes), plugins: [history()] });
function find(s: EditorState, text: string, type = 'paragraph') {
  let result: { pos: number; node: ReturnType<typeof p> } | undefined;
  s.doc.descendants((node, pos) => { if (node.type.name === type && node.textContent === text) result = { pos, node }; });
  assert.ok(result); return result;
}
test('moving a block downward/upward preserves nodes and is one undo step', () => {
  const bold = schema.nodes.paragraph.create(null, schema.text('A', [schema.marks.bold.create()]));
  const initial = state(bold, p('B'), p('C'));
  const tr = moveBlockTransaction(initial, find(initial, 'A'), find(initial, 'C'), true);
  assert.ok(tr);
  const moved = initial.apply(tr);
  assert.equal(moved.doc.textContent, 'BCA');
  assert.deepEqual(moved.doc.lastChild?.toJSON(), bold.toJSON());
  let restored = moved;
  assert.ok(undo(moved, t => { restored = moved.apply(t); }));
  assert.deepEqual(restored.doc.toJSON(), initial.doc.toJSON());
  const back = moveBlockTransaction(moved, find(moved, 'A'), find(moved, 'B'), false);
  assert.ok(back); assert.equal(moved.apply(back).doc.textContent, 'ABC');
});
test('list dragging moves one item, keeps checked state, and can lift it outside the list', () => {
  const initial = state(schema.nodes.taskList.create(null, [task('A', true), task('B', false), task('C', false)]), p('Outside'));
  const source = find(initial, 'A', 'taskItem');
  assert.equal(blockAt(initial.doc, source.pos + 2)?.node.type.name, 'taskItem');
  const tr = moveBlockTransaction(initial, source, find(initial, 'C', 'taskItem'), true);
  assert.ok(tr);
  const moved = initial.apply(tr);
  assert.equal(moved.doc.firstChild?.textContent, 'BCA');
  assert.equal(moved.doc.firstChild?.lastChild?.attrs.checked, true);
  const lifted = moveBlockTransaction(initial, source, find(initial, 'Outside'), true);
  assert.ok(lifted);
  assert.equal(initial.apply(lifted).doc.lastChild?.textContent, 'A');
  assert.equal(initial.apply(lifted).doc.firstChild?.childCount, 2);
});
test('moving the last list item removes its empty list and can move between list types', () => {
  const initial = state(schema.nodes.bulletList.create(null, [li('A')]), schema.nodes.taskList.create(null, [task('B', true)]));
  const tr = moveBlockTransaction(initial, find(initial, 'A', 'listItem'), find(initial, 'B', 'taskItem'), true);
  assert.ok(tr);
  const moved = initial.apply(tr);
  assert.equal(moved.doc.childCount, 1);
  assert.equal(moved.doc.firstChild?.type.name, 'taskList');
  assert.equal(moved.doc.firstChild?.textContent, 'BA');
  assert.equal(moved.doc.firstChild?.lastChild?.attrs.checked, false);
});
test('cannot drop a block into itself or move a stale source', () => {
  const initial = state(p('A'), p('B'));
  const source = find(initial, 'A');
  assert.equal(moveBlockTransaction(initial, source, source, true), null);
  const changed = initial.apply(initial.tr.insertText('new', 1));
  assert.equal(moveBlockTransaction(changed, source, find(changed, 'B'), true), null);
});
function page(id: string, parent: string | null = null, order = 0): Page {
  return { id, parent, order, title: id, icon: '', favorite: false, cover: '', content: '', version: '', updated: '', trashed: false };
}
test('page drops reorder siblings, nest pages, return to root and reject cycles', () => {
  const pages = [page('A', null, 1), page('B', null, 2), page('C', 'A', 1), page('D', 'C', 1)];
  assert.deepEqual(planPageMove(pages, 'B', 'A', 'before').map(p => p.id), ['B', 'A']);
  assert.equal(planPageMove(pages, 'B', 'C', 'inside')[0].parent, 'C');
  assert.deepEqual(planPageMove(pages, 'A', 'D', 'inside'), []);
  assert.deepEqual(planPageMove(pages, 'A', 'C', 'after'), []);
  assert.deepEqual(planPageMove(pages, 'A', 'A', 'after'), []);
  const root = planPageMove(pages, 'D', null, 'root');
  assert.equal(root.at(-1)?.id, 'D');
  assert.ok(root.every(p => p.parent === null));
});
