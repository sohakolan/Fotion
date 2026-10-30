import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSchema } from '@tiptap/core';
import { EditorState } from '@tiptap/pm/state';
import { history, undo } from '@tiptap/pm/history';
import { editorExtensions } from '../../src/features/editor/extensions/editor-extensions';
import { convertToggle } from '../../src/features/editor/lib/toggle-conversion';
const schema = getSchema(editorExtensions());
const paragraph = (text: string) => schema.nodes.paragraph.create(null, schema.text(text, [schema.marks.bold.create()]));

test('converting headings to toggles and back preserves marks and bodies in one undo step', () => {
  const title = schema.nodes.heading.create({ level: 2 }, paragraph('Titre').content);
  let state = EditorState.create({ schema, doc: schema.nodes.doc.create(null, [title, paragraph('Après')]), plugins: [history()] });
  state = state.apply(state.tr.insertText('Modifié ', 1));
  const original = state.doc.toJSON();
  const editedTitle = state.doc.firstChild!;
  const tr = convertToggle(state, 0, { toggle: true, level: 3 }); assert.ok(tr);
  state = state.apply(tr);
  assert.equal(state.doc.firstChild!.type.name, 'toggle');
  assert.deepEqual(state.doc.firstChild!.firstChild!.content.toJSON(), editedTitle.content.toJSON());
  assert.equal(state.doc.firstChild!.firstChild!.attrs.level, 3);
  let restored = state;
  assert.ok(undo(state, tr => { restored = state.apply(tr); }));
  assert.deepEqual(restored.doc.toJSON(), original);
  const body = schema.nodes.toggle.create(null, [schema.nodes.toggleSummary.create({ level: 1 }, title.content), paragraph('Corps'), schema.nodes.blockquote.create(null, paragraph('Citation'))]);
  state = EditorState.create({ schema, doc: schema.nodes.doc.create(null, [body]) });
  const plain = convertToggle(state, 0, { toggle: false, level: 2 }); assert.ok(plain);
  assert.equal(plain.doc.childCount, 3);
  assert.deepEqual(plain.doc.child(0).toJSON(), title.toJSON());
  assert.deepEqual(plain.doc.child(1).toJSON(), body.child(1).toJSON());
  assert.deepEqual(plain.doc.child(2).toJSON(), body.child(2).toJSON());
  const changed = convertToggle(state, 0, { toggle: true, level: 0 }); assert.ok(changed);
  assert.equal(changed.doc.firstChild!.firstChild!.attrs.level, 0);
  assert.deepEqual(changed.doc.firstChild!.child(1).toJSON(), body.child(1).toJSON());
});

test('incompatible source blocks and parent schemas refuse conversion', () => {
  const quote = schema.nodes.blockquote.create(null, paragraph('Citation'));
  const state = EditorState.create({ schema, doc: schema.nodes.doc.create(null, [quote]) });
  assert.equal(convertToggle(state, 0, { toggle: true, level: 1 }), null);
  assert.equal(convertToggle(state, -1, { toggle: true, level: 1 }), null);
  assert.equal(convertToggle(state, 0, { toggle: true, level: 4 }), null);
  const list = schema.nodes.bulletList.create(null, schema.nodes.listItem.create(null, paragraph('Premier')));
  const listed = EditorState.create({ schema, doc: schema.nodes.doc.create(null, list) });
  assert.equal(convertToggle(listed, 2, { toggle: true, level: 1 }), null);
});
