import { pageHref, pageIdFromHref } from '../../shared/page-links';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PageIndex } from '../../src/features/pages/lib/page-index';
import type { Page } from '../../shared/page';
const page = (id: string, title: string, content = '', trashed = false): Page => ({ id, title, content, trashed, icon: '', parent: null, favorite: false, cover: '', version: '1', updated: '2026-10-30T00:00:00Z' });

test('search ranks titles, ignores accents, matches multiple terms and shows nearby content', () => {
  const pages = [page('content.md', 'Notes', 'début '.repeat(60) + 'réunion budget demain'), page('title.md', 'Réunion budget'), page('trash.md', 'Réunion budget', '', true)];
  const index = new PageIndex().update(pages);
  const results = index.search(pages, 'reunion budget');
  assert.deepEqual(results.map(r => r.page.id), ['title.md', 'content.md']);
  assert.match(results[1].excerpt, /….*réunion budget/);
  assert.deepEqual(index.search(pages, 'REUNION demain').map(r => r.page.id), ['content.md']);
  pages[0] = { ...pages[0], content: 'Remplacé' };
  index.update(pages);
  assert.deepEqual(index.search(pages, 'reunion budget').map(r => r.page.id), ['title.md']);
});

test('backlinks include true Markdown links and references, exclude code, images, trash and self', () => {
  const pages = [page('target.md', 'Cible', '[moi](target.md)'), page('a.md', 'Source', '[lien](./target.md)\n\n`[code](false.md)`\n\n```md\n[exemple](false.md)\n```\n\n![image](false.md)\n\n[référence][id]\n\n[id]: target.md'), page('b.md', 'Corbeille', '[lien](target.md)', true), page('toggle.md', 'Dépliant', '<details>\n<summary>Titre</summary>\n\n[lien](target.md)\n\n```md\n[code](false.md)\n```\n\n</details>')];
  const index = new PageIndex().update(pages);
  assert.deepEqual(index.backlinks(pages, 'target.md').map(p => p.id), ['a.md', 'toggle.md']);
  assert.deepEqual(index.backlinks(pages, 'false.md'), []);
  pages[1] = { ...pages[1], content: '', title: 'Renommée' };
  index.update(pages);
  assert.deepEqual(index.backlinks(pages, 'target.md').map(p => p.id), ['toggle.md']);
});

test('file links preserve unicode and reserved characters without allowing traversal or schemes', () => {
  const id = 'Réunion #1 (été).md';
  assert.equal(pageIdFromHref(pageHref(id)), id);
  assert.equal(pageIdFromHref('page.md#section'), 'page.md');
  for (const value of ['../page.md', './%2E%2E%2Fpage.md', '/page.md', 'https://site/page.md', 'javascript:page.md', 'a%5Cb.md', '%invalid.md', '.hidden.md', 'page.txt']) assert.equal(pageIdFromHref(value), null, value);
});

test('mention links remain backlinks for the independent Markdown index', () => {
  const pages = [page('source.md', 'Source', '[Titre actuel](./target.md "fotion:page")')];
  const index = new PageIndex().update(pages);
  assert.deepEqual(index.backlinks(pages, 'target.md').map(p => p.id), ['source.md']);
});
