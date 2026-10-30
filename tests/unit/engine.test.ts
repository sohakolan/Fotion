import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Editor } from '@tiptap/core';
import { documentExtensions, convertToggle, countWords, slashCommands, searchSlashCommands, slashQuery, PageIndex, recencyGroup } from '../../engine';
const { JSDOM } = createRequire(import.meta.url)('jsdom');
const dom = new JSDOM('<!doctype html><body></body>');
Object.assign(globalThis, { window: dom.window, document: dom.window.document, DOMParser: dom.window.DOMParser, Node: dom.window.Node, HTMLElement: dom.window.HTMLElement, getComputedStyle: dom.window.getComputedStyle });

test('document engine works without UI views and keeps the Markdown contract', () => {
  const editor = new Editor({ extensions: documentExtensions(), content: '# Titre **riche**\n\n> [!NOTE]\n> Un encadré\n\n<details>\n<summary><h2>Détails</h2></summary>\n\nCorps\n\n</details>\n\n```ts\nconst answer = 42;\n```\n\nFin.', contentType: 'markdown' });
  assert.equal(editor.view.dom.querySelector('button, input, form'), null);
  assert.equal(editor.view.dom.querySelector('.hljs-keyword'), null);
  const before = editor.getJSON();
  const markdown = editor.getMarkdown();
  editor.commands.setContent(markdown, { contentType: 'markdown' });
  assert.deepEqual(editor.getJSON(), before);
  const tr = convertToggle(editor.state, 0, { toggle: true, level: 1 });
  assert.ok(tr); editor.view.dispatch(tr);
  const converted = editor.getJSON();
  editor.commands.setContent(editor.getMarkdown(), { contentType: 'markdown' });
  assert.deepEqual(editor.getJSON(), converted);
  editor.destroy();
});

test('independent engine editors serialize rich tables without sharing UI or schema state', () => {
  const content = '<table data-fotion-table><tr><td colwidth="180"><p>A  B</p><p>Suite</p></td><th><p>Titre</p></th></tr></table>\n\nFin.';
  const first = new Editor({ extensions: documentExtensions(), content, contentType: 'markdown' });
  const second = new Editor({ extensions: documentExtensions(), content: 'Autre page', contentType: 'markdown' });
  const before = first.getJSON();
  first.commands.setContent(first.getMarkdown(), { contentType: 'markdown' });
  assert.deepEqual(first.getJSON(), before);
  assert.equal(second.getMarkdown(), 'Autre page');
  assert.equal(first.view.dom.querySelector('.column-resize-handle') === null, true);
  first.destroy(); second.destroy();
});

test('Notion Markdown shortcuts create toggles and quotes while keeping the typed text', () => {
  const type = (editor: Editor, text: string) => { const { from, to } = editor.state.selection; if (!editor.view.someProp('handleTextInput', f => f(editor.view, from, to, text, () => editor.state.tr.insertText(text, from, to)))) editor.view.dispatch(editor.state.tr.insertText(text, from, to)); };
  const editor = new Editor({ extensions: documentExtensions(), content: 'Résumé', contentType: 'markdown' });
  editor.commands.setTextSelection(1);
  type(editor, '>'); type(editor, ' ');
  assert.equal(editor.state.doc.firstChild?.type.name, 'toggle');
  assert.equal(editor.state.doc.firstChild?.firstChild?.textContent, 'Résumé');
  assert.equal(editor.state.selection.$from.parent.type.name, 'toggleSummary');
  editor.commands.setContent('', { contentType: 'markdown' });
  editor.commands.setTextSelection(1);
  type(editor, '"'); type(editor, ' '); type(editor, 'Cité');
  assert.equal(editor.getMarkdown().trim(), '> Cité');
  editor.commands.setContent('- élément', { contentType: 'markdown' });
  editor.commands.setTextSelection(3);
  type(editor, '>'); type(editor, ' ');
  assert.equal(editor.state.doc.firstChild?.type.name, 'bulletList');
  editor.destroy();
});

test('word count follows Intl word segmentation', () => {
  assert.equal(countWords(''), 0);
  assert.equal(countWords("L'été — très   chaud, 42 fois !"), 5);
});

test('slash commands are detected like Notion and ranked by relevance', () => {
  assert.deepEqual(slashQuery('/'), { query: '', length: 1 });
  assert.deepEqual(slashQuery('Bonjour /tit'), { query: 'tit', length: 4 });
  assert.deepEqual(slashQuery('/titre 1'), { query: 'titre 1', length: 8 });
  assert.equal(slashQuery('et/ou'), null);
  assert.equal(slashQuery('https://exemple.fr/a'), null);
  assert.equal(slashQuery('/ texte'), null);
  const ids = (query: string) => searchSlashCommands(query, slashCommands).map(command => command.id);
  assert.equal(ids('').length, slashCommands.filter(command => !command.hidden).length);
  assert.equal(ids('h1')[0], 'heading1');
  assert.equal(ids('todo')[0], 'taskList');
  assert.equal(ids('bullet')[0], 'bulletList');
  assert.equal(ids('separateur')[0], 'divider');
  assert.equal(ids('cit')[0], 'quote');
  assert.equal(ids('tbl')[0], 'table');
  assert.deepEqual(ids('zzz'), []);
});

test('search can be limited to titles and groups pages by recency', () => {
  const page = (id: string, title: string, content: string, updated: string) => ({ id, title, content, updated, icon: '', parent: null, favorite: false, cover: '', version: '', trashed: false });
  const pages = [page('a.md', 'Budget', 'Rien', '2026-10-30T08:00:00'), page('b.md', 'Notes', 'Le budget du trimestre', '2026-10-29T08:00:00')];
  const index = new PageIndex(); index.update(pages);
  assert.deepEqual(index.search(pages, 'budget').map(r => r.page.id), ['a.md', 'b.md']);
  assert.deepEqual(index.search(pages, 'budget', { titleOnly: true }).map(r => r.page.id), ['a.md']);
  const now = new Date('2026-10-30T20:00:00');
  assert.equal(recencyGroup('2026-10-30T00:30:00', now), 'Aujourd’hui');
  assert.equal(recencyGroup('2026-10-29T23:00:00', now), 'Hier');
  assert.equal(recencyGroup('2026-10-25T12:00:00', now), '7 derniers jours');
  assert.equal(recencyGroup('2026-10-05T12:00:00', now), '30 derniers jours');
  assert.equal(recencyGroup('2026-01-01T12:00:00', now), 'Plus ancien');
});

test('FotionMark columns open in the editor and unknown blocks are saved back unchanged', () => {
  const source = '::::columns\n:::column{width=60%}\n## Gauche\n\n- [ ] Tâche\n:::\n:::column\nDroite\n:::\n::::\n\n::kanban{src=./Projets view=Statut}\n\n:::column\nIsolée\n:::\n\nFin.';
  const editor = new Editor({ extensions: documentExtensions(), content: source, contentType: 'markdown' });
  const types = editor.getJSON().content?.map(node => node.type);
  assert.deepEqual(types, ['columns', 'directiveBlock', 'directiveBlock', 'paragraph']);
  assert.deepEqual(editor.state.doc.firstChild?.firstChild?.attrs.attributes, { width: '60%' });
  const saved = editor.getMarkdown();
  assert.ok(saved.includes('::kanban{src=./Projets view=Statut}') && saved.includes(':::column\nIsolée\n:::'), saved);
  const before = editor.getJSON();
  editor.commands.setContent(saved, { contentType: 'markdown' });
  assert.deepEqual(editor.getJSON(), before);
  editor.destroy();
});

test('FotionMark keeps unknown attributes and isolates an invalid child inside a valid block', () => {
  const source = '::::columns{futur=oui}\n:::column{width=40% couleur=bleu}\nA\n\n::sondage{question=Q}\n:::\n:::column\nB\n:::\n::::';
  const editor = new Editor({ extensions: documentExtensions(), content: source, contentType: 'markdown' });
  const columns = editor.state.doc.firstChild!;
  assert.equal(columns.type.name, 'columns');
  assert.deepEqual(columns.firstChild!.content.content.map(node => node.type.name), ['paragraph', 'directiveBlock']);
  assert.equal(editor.getMarkdown(), source);
  assert.equal(editor.view.dom.querySelector<HTMLElement>('.fm-column')?.style.flex, '0 0 40%');
  editor.destroy();
});

// `mod` is Cmd on macOS and Ctrl elsewhere, exactly as ProseMirror's keymap resolves `Mod-`.
const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|[oa]d)/.test(navigator.platform);
const press = (editor: Editor, key: string, modifiers: { ctrl?: boolean; mod?: boolean; alt?: boolean; shift?: boolean } = {}) => {
  const event = new dom.window.KeyboardEvent('keydown', { key, ctrlKey: !!modifiers.ctrl || (!!modifiers.mod && !isMac), metaKey: !!modifiers.mod && isMac, altKey: !!modifiers.alt, shiftKey: !!modifiers.shift, bubbles: true });
  return editor.view.someProp('handleKeyDown', f => f(editor.view, event as unknown as KeyboardEvent));
};
const typeText = (editor: Editor, text: string) => { for (const char of text) { const { from, to } = editor.state.selection; if (!editor.view.someProp('handleTextInput', f => f(editor.view, from, to, char, () => editor.state.tr.insertText(char, from, to)))) editor.view.dispatch(editor.state.tr.insertText(char, from, to)); } };

test('Notion typing shortcuts: single-tilde strike and lettered lists', () => {
  const editor = new Editor({ extensions: documentExtensions(), content: '', contentType: 'markdown' });
  editor.commands.setTextSelection(1);
  typeText(editor, 'Un ~mot~ ');
  assert.equal(editor.getMarkdown().trim(), 'Un ~~mot~~');
  editor.commands.setContent('', { contentType: 'markdown' }); editor.commands.setTextSelection(1);
  typeText(editor, 'a. Premier');
  assert.equal(editor.state.doc.firstChild?.type.name, 'orderedList');
  editor.destroy();
});

test('Notion block keys: turn into, move, Escape block selection, Enter back to text', () => {
  const editor = new Editor({ extensions: documentExtensions(), content: 'Un\n\nDeux\n\nTrois', contentType: 'markdown' });
  editor.commands.setTextSelection(6);
  assert.ok(press(editor, '1', { ctrl: true, shift: true }));
  assert.equal(editor.state.doc.child(1).type.name, 'heading');
  assert.ok(press(editor, '0', { ctrl: true, shift: true }));
  assert.ok(press(editor, '4', { ctrl: true, shift: true }));
  assert.equal(editor.state.doc.child(1).type.name, 'taskList');
  assert.ok(press(editor, 'Enter', { mod: true }));
  assert.equal(editor.state.doc.child(1).firstChild?.attrs.checked, true);
  assert.ok(press(editor, 'ArrowUp', { mod: true, shift: true }));
  assert.deepEqual(editor.state.doc.content.content.map(node => node.textContent), ['Deux', 'Un', 'Trois']);
  editor.commands.setTextSelection(editor.state.doc.content.size - 2);
  assert.ok(press(editor, 'Escape'));
  assert.equal(editor.state.selection.constructor.name, 'NodeSelection');
  assert.ok(press(editor, 'ArrowUp'));
  assert.equal((editor.state.selection as unknown as { node: { textContent: string } }).node.textContent, 'Un');
  assert.ok(press(editor, 'Enter'));
  assert.equal(editor.state.selection.$from.parent.textContent, 'Un');
  editor.destroy();
});

test('slash catalogue hides actions and colours until the user types', () => {
  const ids = (query: string) => searchSlashCommands(query, slashCommands).map(command => command.id);
  assert.ok(!ids('').includes('duplicate') && !ids('').includes('color-red'));
  assert.equal(ids('dupl')[0], 'duplicate');
  assert.ok(ids('rouge').includes('color-red') && ids('rouge').includes('background-red'));
  assert.equal(ids('turn h1')[0], 'turn-heading1');
  assert.equal(ids('#')[0], 'heading1');
  assert.equal(ids('num')[0], 'orderedList');
});
