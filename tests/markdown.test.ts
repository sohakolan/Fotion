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


test('code fences, language, caption and wrapping survive Markdown and HTML round-trips', () => {
  for (const language of [null, 'typescript', 'unknown-language', 'custom`language']) {
    const editor = new Editor({ extensions: editorExtensions(), content: { type: 'doc', content: [
      { type: 'codeBlock', attrs: { language, wrap: true, caption: 'Exemple <script> & "citation" 😀' }, content: [{ type: 'text', text: '```\n~~~\nconst value = `<span> & ${1}`;\n\n' }] },
      { type: 'paragraph' },
    ] } });
    const before = editor.getJSON();
    const html = editor.getHTML();
    editor.commands.setContent(editor.getMarkdown(), { contentType: 'markdown' });
    assert.deepEqual(editor.getJSON(), before, `Markdown language ${language}`);
    editor.commands.setContent(html);
    assert.deepEqual(editor.getJSON(), before, `HTML language ${language}`);
    editor.destroy();
  }
});

test('plain code stays plain and known languages receive syntax decorations without changing saved text', () => {
  const editor = new Editor({ extensions: editorExtensions(), content: '```typescript\nconst answer = 42;\n```', contentType: 'markdown' });
  assert.ok(editor.view.dom.querySelector('.hljs-keyword'));
  assert.equal(editor.state.doc.textContent, 'const answer = 42;');
  editor.commands.setTextSelection(1);
  editor.commands.updateAttributes('codeBlock', { language: null });
  assert.equal(editor.view.dom.querySelector('.hljs-keyword'), null);
  assert.equal(editor.getMarkdown().trimEnd(), '```\nconst answer = 42;\n```');
  editor.commands.setContent('```python fotion=broken\nprint(1)\n```', { contentType: 'markdown' });
  assert.equal(editor.getAttributes('codeBlock').language, 'python fotion=broken');
  editor.destroy();
});
