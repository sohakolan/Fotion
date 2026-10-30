import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Editor } from '@tiptap/core';
import { editorExtensions } from '../src/extensions';
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
Object.assign(globalThis, { window: dom.window, document: dom.window.document, DOMParser: dom.window.DOMParser, Node: dom.window.Node, HTMLElement: dom.window.HTMLElement, getComputedStyle: dom.window.getComputedStyle });

test('supported Markdown survives editor parse, edit, serialization and reload', () => {
  const input = '# Titre\n\nUn **mot fort**, *italique*, ~~barré~~ et `code`.\n\n- premier\n- second\n\n1. étape\n2. suite\n\n- [x] fait\n- [ ] à faire\n\n> Une citation\n\n---\n\n```ts\nconst x = 1;\n```\n\n| Nom | Statut |\n| --- | --- |\n| Fotion | En cours |\n\n[Un lien](https://example.com)\n';
  const editor = new Editor({ extensions: editorExtensions(), content: input, contentType: 'markdown' });
  const before = editor.getJSON();
  const output = editor.getMarkdown();
  assert.match(output, /\*\*mot fort\*\*/);
  assert.match(output, /\[x\] fait/);
  assert.match(output, /\[ \] à faire/);
  assert.match(output, /\| Fotion/);
  editor.commands.setContent(output, { contentType: 'markdown' });
  assert.deepEqual(editor.getJSON(), before);
  editor.commands.insertContentAt(1, 'Modifié ');
  assert.match(editor.getMarkdown(), /Modifié Titre/);
  editor.destroy();
});

test('callouts, nested toggles and underline retain content through Markdown', () => {
  const editor = new Editor({ extensions: editorExtensions(), content: { type: 'doc', content: [
    { type: 'callout', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'À retenir', marks: [{ type: 'bold' }] }] }] },
    { type: 'toggle', content: [
      { type: 'toggleSummary', content: [{ type: 'text', text: 'Détails' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Contenu', marks: [{ type: 'underline' }] }] },
      { type: 'codeBlock', attrs: { language: 'html' }, content: [{ type: 'text', text: '<details>\n<summary>Exemple de code</summary>\n</details>' }] },
      { type: 'toggle', content: [{ type: 'toggleSummary', content: [{ type: 'text', text: 'Imbriqué' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Conservé' }] }] },
    ] },
    { type: 'paragraph' },
  ] } });
  const before = editor.getJSON();
  const markdown = editor.getMarkdown();
  assert.match(markdown, /> \[!NOTE\]/);
  assert.match(markdown, /<details>/);
  assert.match(markdown, /<u>Contenu<\/u>/);
  editor.commands.setContent(markdown, { contentType: 'markdown' });
  assert.deepEqual(editor.getJSON(), before);
  editor.destroy();
});

test('text and background colors preserve nested marks, literal HTML and undo through Markdown', () => {
  const editor = new Editor({ extensions: editorExtensions(), content: { type: 'doc', content: [{ type: 'paragraph', content: [
    { type: 'text', text: 'Important & <tag>', marks: [{ type: 'bold' }, { type: 'underline' }, { type: 'textColor', attrs: { color: 'red', background: 'yellow' } }] },
    { type: 'text', text: ' puis ' },
    { type: 'text', text: '</span>', marks: [{ type: 'code' }, { type: 'textColor', attrs: { color: 'blue', background: 'default' } }] },
  ] }] } });
  const before = editor.getJSON();
  const markdown = editor.getMarkdown();
  assert.match(markdown, /data-fotion-color="red"/);
  editor.commands.setContent(markdown, { contentType: 'markdown' });
  assert.deepEqual(editor.getJSON(), before);
  editor.commands.setTextSelection({ from: 1, to: 10 });
  editor.commands.setMark('textColor', { color: 'green' });
  assert.equal(editor.getAttributes('textColor').background, 'yellow');
  assert.equal(editor.getAttributes('textColor').color, 'green');
  editor.commands.undo();
  assert.deepEqual(editor.getJSON(), before);
  editor.commands.unsetAllMarks();
  assert.equal(editor.isActive('textColor'), false);
  editor.destroy();
});
