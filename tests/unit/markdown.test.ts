import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Editor } from '@tiptap/core';
import { editorExtensions } from '../../ui/features/editor/extensions/editor-extensions';
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

test('images keep alt, caption and width through Markdown with a reversible comment', () => {
  const input = '![Légende du visuel](attachments/clap.png) <!-- fotion:image %7B%22width%22%3A50%2C%22caption%22%3A%22L%C3%A9gende%20du%20visuel%22%7D -->\n';
  const editor = new Editor({ extensions: editorExtensions(), content: input, contentType: 'markdown' });
  const before = editor.getJSON();
  assert.equal(before.type, 'doc');
  const node = before.content?.[0];
  assert.equal(node?.type, 'image');
  assert.equal(node?.attrs?.src, 'attachments/clap.png');
  assert.equal(node?.attrs?.width, 50);
  assert.equal((node?.content?.[0] as { text?: string } | undefined)?.text, 'Légende du visuel');
  assert.equal(editor.getMarkdown(), input.replace(/\n$/, ''));
  // A plain image without extras keeps the standard Markdown form.
  const plain = '![Texte alternatif](https://example.com/a.png)\n';
  const editor2 = new Editor({ extensions: editorExtensions(), content: plain, contentType: 'markdown' });
  const plainNode = editor2.getJSON().content?.[0];
  assert.equal(plainNode?.type, 'image');
  assert.equal(plainNode?.attrs?.width, null);
  assert.equal(editor2.getMarkdown(), plain.replace(/\n$/, ''));
  // An image inside a longer line of text is reflowed as its own block, like Notion.
  const mixed = 'Avant ![img](https://example.com/b.png) après\n';
  const editor3 = new Editor({ extensions: editorExtensions(), content: mixed, contentType: 'markdown' });
  const reflowed = editor3.getJSON();
  assert.equal(reflowed.content?.[0]?.type, 'paragraph');
  assert.equal(reflowed.content?.[0]?.content?.[1]?.type, 'image');
  assert.match(editor3.getMarkdown(), /!\[img\]\(https:\/\/example\.com\/b\.png\)/);
  editor.destroy(); editor2.destroy(); editor3.destroy();
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

test('plain code stays plain and known languages receive syntax decorations without changing saved text', async () => {
  const editor = new Editor({ extensions: editorExtensions(), content: '```typescript\nconst answer = 42;\n```', contentType: 'markdown' });
  const beforeHighlight = editor.getJSON();
  for (let i = 0; i < 100 && !editor.view.dom.querySelector('.hljs-keyword'); i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.ok(editor.view.dom.querySelector('.hljs-keyword'));
  assert.deepEqual(editor.getJSON(), beforeHighlight);
  assert.equal(editor.state.doc.textContent, 'const answer = 42;');
  editor.commands.setTextSelection(1);
  editor.commands.updateAttributes('codeBlock', { language: null });
  assert.equal(editor.view.dom.querySelector('.hljs-keyword'), null);
  assert.equal(editor.getMarkdown().trimEnd(), '```\nconst answer = 42;\n```');
  editor.commands.setContent('```python fotion=broken\nprint(1)\n```', { contentType: 'markdown' });
  assert.equal(editor.getAttributes('codeBlock').language, 'python fotion=broken');
  editor.destroy();
});


test('internal file links remain relative and keep their label through Markdown', () => {
  const editor = new Editor({ extensions: editorExtensions(), content: 'Une sélection', contentType: 'markdown' });
  editor.commands.setTextSelection({ from: 1, to: 4 });
  editor.commands.setLink({ href: './R%C3%A9union%20%231%20(%C3%A9t%C3%A9).md' });
  const before = editor.getJSON();
  editor.commands.setContent(editor.getMarkdown(), { contentType: 'markdown' });
  assert.deepEqual(editor.getJSON(), before);
  assert.match(editor.getHTML(), /href="\.\/R%C3%A9union/);
  editor.destroy();
});

test('page mentions preserve stable targets, escaped labels, ordinary links and HTML clipboard', () => {
  const label = 'Plan [été] *test* \\ <b> & 😀';
  const editor = new Editor({ extensions: editorExtensions(), content: { type: 'doc', content: [{ type: 'paragraph', content: [
    { type: 'text', text: 'Voir ' },
    { type: 'pageMention', attrs: { id: 'été (1).md', label } },
    { type: 'text', text: ' ' },
    { type: 'text', text: 'et un lien', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] },
  ] }] } });
  const before = editor.getJSON(), markdown = editor.getMarkdown(), html = editor.getHTML();
  assert.match(markdown, /"fotion:page"/);
  editor.commands.setContent(markdown, { contentType: 'markdown' });
  assert.deepEqual(editor.getJSON(), before);
  editor.commands.setContent(html);
  assert.deepEqual(editor.getJSON(), before);
  editor.destroy();
});

test('page mention titles update without modifying document history and remain navigable when unavailable', () => {
  let target: { title: string; icon: string; trashed: boolean } | undefined = { title: 'Avant', icon: '📄', trashed: false };
  const editor = new Editor({ extensions: editorExtensions(() => target), content: 'Un début', contentType: 'markdown' });
  editor.commands.insertContentAt(9, { type: 'pageMention', attrs: { id: 'page.md', label: 'Avant' } });
  const snapshot = editor.getJSON();
  assert.match(editor.view.dom.querySelector('.page-mention')!.textContent!, /Avant/);
  target = { title: 'Après', icon: '💡', trashed: false };
  editor.view.dispatch(editor.state.tr.setMeta('pageMentionsChanged', true).setMeta('addToHistory', false));
  assert.match(editor.view.dom.querySelector('.page-mention')!.textContent!, /Après/);
  assert.match(editor.getMarkdown(), /\[Après\]/);
  assert.deepEqual(editor.getJSON(), snapshot);
  target = undefined;
  editor.view.dispatch(editor.state.tr.setMeta('pageMentionsChanged', true).setMeta('addToHistory', false));
  assert.ok(editor.view.dom.querySelector('.mention-unavailable'));
  editor.commands.undo();
  assert.equal(editor.view.dom.querySelector('.page-mention'), null);
  editor.destroy();
});

test('table of contents survives Markdown and HTML and follows heading edits without document mutations', () => {
  const editor = new Editor({ extensions: editorExtensions(), content: '<nav data-fotion-toc></nav>\n\n# Introduction\n\n## Suite\n\n# Introduction\n\nFin.', contentType: 'markdown' });
  const before = editor.getJSON();
  const toc = () => editor.view.dom.querySelector('nav')!;
  const labels = () => [...toc().querySelectorAll('button')].map(button => button.textContent);
  assert.deepEqual(labels(), ['Introduction', 'Suite', 'Introduction']);
  assert.equal(editor.state.doc.firstChild?.type.name, 'tableOfContents');
  const markdown = editor.getMarkdown();
  assert.match(markdown, /<nav data-fotion-toc><\/nav>/);
  editor.commands.setContent(markdown, { contentType: 'markdown' });
  assert.deepEqual(editor.getJSON(), before);
  editor.commands.setContent(editor.getHTML());
  assert.deepEqual(editor.getJSON(), before);
  editor.commands.insertContentAt(2, 'Nouvelle ');
  assert.deepEqual(labels(), ['Nouvelle Introduction', 'Suite', 'Introduction']);
  editor.commands.undo();
  assert.deepEqual(editor.getJSON(), before);
  assert.deepEqual(labels(), ['Introduction', 'Suite', 'Introduction']);
  editor.commands.insertContentAt(editor.state.doc.content.size, { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Ajout' }] });
  assert.deepEqual(labels(), ['Introduction', 'Suite', 'Introduction', 'Ajout']);
  let remove = 0;
  editor.state.doc.descendants((node, pos) => { if (node.type.name === 'heading' && node.textContent === 'Suite') remove = pos; });
  editor.commands.deleteRange({ from: remove, to: remove + editor.state.doc.nodeAt(remove)!.nodeSize });
  assert.deepEqual(labels(), ['Introduction', 'Introduction', 'Ajout']);
  editor.commands.setContent('<nav data-fotion-toc></nav>', { contentType: 'markdown' });
  assert.equal(toc().querySelectorAll('button').length, 0);
  assert.match(toc().textContent || '', /Ajoutez des titres/);
  editor.destroy();
});

test('toggle headings keep levels, rich titles and nested contents through Markdown and HTML', () => {
  const content = [1, 2, 3].map(level => ({ type: 'toggle', content: [
    { type: 'toggleSummary', attrs: { level }, content: [{ type: 'text', text: `Section ${level} & <exemple>`, marks: [{ type: 'bold' }] }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Contenu conservé' }] },
    { type: 'toggle', content: [{ type: 'toggleSummary', content: [{ type: 'text', text: 'Détails' }] }, { type: 'paragraph' }] },
  ] }));
  const editor = new Editor({ extensions: editorExtensions(), content: { type: 'doc', content: [{ type: 'tableOfContents' }, ...content, { type: 'paragraph' }] } });
  const before = editor.getJSON();
  const markdown = editor.getMarkdown();
  assert.match(markdown, /<summary><h2>/);
  editor.commands.setContent(markdown, { contentType: 'markdown' });
  assert.deepEqual(editor.getJSON(), before);
  editor.commands.setContent(editor.getHTML());
  assert.deepEqual(editor.getJSON(), before);
  assert.deepEqual([...editor.view.dom.querySelectorAll('nav button')].map(button => button.textContent), [1, 2, 3].map(level => `Section ${level} & <exemple>`));
  assert.equal(editor.view.dom.querySelectorAll('summary > h1,summary > h2,summary > h3').length, 3);
  editor.destroy();
});

test('custom callouts keep icons, colors and rich nested contents through Markdown and HTML', () => {
  const editor = new Editor({ extensions: editorExtensions(), content: { type: 'doc', content: [
    { type: 'callout', attrs: { icon: '🎯', color: 'blue', background: 'yellow' }, content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Important <texte>', marks: [{ type: 'bold' }] }] },
      { type: 'callout', attrs: { icon: '', background: 'red' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Imbriqué' }] }] },
    ] }, { type: 'paragraph' },
  ] } });
  const before = editor.getJSON();
  const markdown = editor.getMarkdown();
  assert.match(markdown, /fotion:callout/);
  editor.commands.setContent(markdown, { contentType: 'markdown' });
  assert.deepEqual(editor.getJSON(), before);
  editor.commands.setContent(editor.getHTML());
  assert.deepEqual(editor.getJSON(), before);
  assert.equal(editor.state.doc.textContent, 'Important <texte>Imbriqué');
  const picker = editor.view.dom.firstElementChild!.lastElementChild!;
  [...picker.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === '🚀')!.click();
  assert.equal(editor.state.doc.firstChild!.attrs.icon, '🚀');
  editor.commands.undo();
  assert.deepEqual(editor.getJSON(), before);
  editor.commands.setContent('> [!NOTE] <!-- fotion:callout %invalid -->\n> Texte conservé\n\nFin.', { contentType: 'markdown' });
  assert.equal(editor.state.doc.firstChild!.attrs.icon, '💡');
  assert.equal(editor.state.doc.firstChild!.textContent, 'Texte conservé');
  editor.destroy();
});

test('table headers, widths, spans and rich cells survive Markdown without a synthetic header', () => {
  const p = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
  const editor = new Editor({ extensions: editorExtensions(), content: { type: 'doc', content: [
    { type: 'table', content: [
      { type: 'tableRow', content: [
        { type: 'tableCell', attrs: { colwidth: [180] }, content: [p('Sans en-tête'), p('Second paragraphe')] },
        { type: 'tableHeader', attrs: { colwidth: [220] }, content: [{ type: 'codeBlock', attrs: { language: 'text' }, content: [{ type: 'text', text: '<table>\n\ncode & texte\n</table>' }] }] },
      ] },
      { type: 'tableRow', content: [
        { type: 'tableCell', attrs: { colspan: 2, colwidth: [180, 220] }, content: [p(' Cellule  avec espaces ')] },
      ] },
    ] }, { type: 'paragraph' },
  ] } });
  const before = editor.getJSON();
  const markdown = editor.getMarkdown();
  assert.match(markdown, /^<table/);
  assert.match(markdown, /&#10;/);
  editor.commands.setContent(markdown, { contentType: 'markdown' });
  assert.deepEqual(editor.getJSON(), before);
  editor.destroy();
});
