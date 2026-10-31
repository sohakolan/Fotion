import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSchema } from '@tiptap/core';
import { common } from 'lowlight';
import { editorExtensions } from '../../ui/features/editor/extensions/editor-extensions';
import { codeLanguages } from '../../ui/features/editor/extensions/code-block';
import { highlightDocument } from '../../ui/features/editor/lib/syntax-highlighting';

test('the language picker matches the deferred grammars and aliases keep correct offsets', () => {
  const extras = new Set(codeLanguages.filter(language => !common[language] && language !== 'plaintext'));
  assert.ok(extras.size > 0, 'the picker keeps deferred languages outside the common bundle');
  const schema = getSchema(editorExtensions());
  const paragraph = schema.nodes.paragraph.create(null, schema.text('Avant'));
  const code = (language: string) => schema.nodes.codeBlock.create({ language }, schema.text('const answer = 42;'));
  const doc = schema.nodes.doc.create(null, [paragraph, code('ts'), code('plaintext'), code('inconnu')]);
  const before = doc.toJSON();
  const ranges = highlightDocument(doc).find();
  assert.ok(ranges.length > 0);
  for (const range of ranges) {
    assert.ok(range.from >= paragraph.nodeSize + 1);
    assert.ok(range.to <= paragraph.nodeSize + doc.child(1).nodeSize - 1);
  }
  assert.deepEqual(doc.toJSON(), before);
  assert.deepEqual(highlightDocument(doc).find().map(range => [range.from, range.to]), ranges.map(range => [range.from, range.to]));
});
