import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Editor } from '@tiptap/core';
import { detectLanguage, codeTab } from '../../engine';
import { documentExtensions } from '../../engine';
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
Object.assign(globalThis, { window: dom.window, document: dom.window.document, DOMParser: dom.window.DOMParser, Node: dom.window.Node, HTMLElement: dom.window.HTMLElement, getComputedStyle: dom.window.getComputedStyle });

const samples: Array<[string, string | null]> = [
  ['const api = await fetch(url);   // endpoint\nconsole.log(api);', 'javascript'],
  ['const greeting: string = "Bonjour"\ninterface User { age: number }', 'typescript'],
  ['def process(items):\n    for item in items:\n        print(item)', 'python'],
  ['SELECT name, price\nFROM products\nWHERE price > 10', 'sql'],
  ['# Titre principal\n\n**gras** et [lien](https://a.b)', 'markdown'],
  ['[section]\nclave = valor\n; commentaire', 'ini'],
  ['html:\n  - <div>ok</div>\n---\nnested: true', 'yaml'],
  ['const styles = () => {\n  return { padding: 4 };\n}\n\n.cadre { margin: 0; }', 'javascript'],
  ['.cadre { margin: 0 }\n.bord { padding: 2px 4px; }', 'css'],
  ['diff --git a/notes.md b/notes.md\n--- a/notes.md\n+++ b/notes.md', 'diff'],
  ['for (const user of users) {\n  if (user.age) return;\n}', 'javascript'],
  ['erreur totalement hors langue', null],
];
for (const [code, expected] of samples) assert.equal(detectLanguage(code), expected, JSON.stringify(code));

test('Tab and Maj+Tab indent code lines in place, without leaving the block', () => {
  const editor = new Editor({ extensions: documentExtensions(), content: '```ts\nconst a = 1;\n\nconst b = 2;\n```\n', contentType: 'markdown' });
  const insidePos = 1; // First character of the block: 'const…'.
  editor.commands.setTextSelection(insidePos + 8);
  const indent = codeTab(editor.state, 1);
  assert.ok(indent, 'Tab applies inside code');
  editor.view.dispatch(indent);
  assert.equal(editor.state.doc.child(0).textContent, '  const a = 1;\n\nconst b = 2;')
  const block = editor.state.doc.child(0);
  const caretCode = editor.state.selection.from === 11; // inside the block text, after the added spaces
  assert.ok(caretCode, `the caret stays inside the block (${editor.state.selection.from}, block size ${block.nodeSize})`);
  const undent = codeTab(editor.state, -1);
  assert.ok(undent, 'Maj+Tab removes two spaces');
  editor.view.dispatch(undent);
  assert.equal(editor.state.doc.child(0).textContent, 'const a = 1;\n\nconst b = 2;');
  // A line without leading spaces stays where it is on Maj+Tab.
  const blockText = editor.state.doc.child(0).textContent;
  editor.commands.setTextSelection(1 + blockText.lastIndexOf('const b'));
  const restore = codeTab(editor.state, 1);
  editor.view.dispatch(restore!);
  const undentAnywhere = codeTab(editor.state, -1);
  assert.ok(undentAnywhere);
  editor.view.dispatch(undentAnywhere);
  assert.equal(editor.state.doc.child(0).textContent, 'const a = 1;\n\nconst b = 2;');
  editor.destroy();
});
