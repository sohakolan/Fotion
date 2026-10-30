import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { Vault, VaultError, decode, vaultMiddleware } from '../server/vault';
const blank = { title: 'Essai', icon: '📝', parent: null, favorite: false, cover: '', content: '# Bonjour\n\n- [ ] Une tâche\n', trashed: false };
function fixture(t: { after: (fn: () => void) => void }) {
  const root = mkdtempSync(join(tmpdir(), 'fotion-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return new Vault(root);
}
test('saves real Markdown, survives reopening and retains the previous file', t => {
  const vault = fixture(t);
  const page = vault.create(blank);
  const saved = vault.write(page.id, { ...page, content: '**Nouvelle idée**' }, page.version);
  const reopened = new Vault(vault.root).read(page.id);
  assert.equal(reopened.content, '**Nouvelle idée**');
  assert.equal(reopened.version, saved.version);
  const file = readFileSync(join(vault.root, page.id), 'utf8');
  assert.ok(file.includes('title: Essai'));
  assert.ok(!file.includes('version:'));
  const history = readdirSync(join(vault.root, '.history'));
  assert.equal(history.length, 1);
  assert.ok(readFileSync(join(vault.root, '.history', history[0]), 'utf8').includes('# Bonjour'));
});
test('rejects stale saves without overwriting an external edit', t => {
  const vault = fixture(t), page = vault.create(blank);
  const external = '# Écrit dans Obsidian\n';
  writeFileSync(join(vault.root, page.id), external);
  assert.throws(() => vault.write(page.id, page, page.version), (e: unknown) => e instanceof VaultError && e.status === 409);
  assert.equal(readFileSync(join(vault.root, page.id), 'utf8'), external);
});
test('keeps unknown frontmatter, import contents and recoverable trash', t => {
  const vault = fixture(t);
  const page = vault.import('Carnet.md', '---\ntags: [perso, idée]\naliases: [carnet]\n---\n\n## Pensées\n');
  assert.equal(page.title, 'Carnet');
  const trashed = vault.write(page.id, { ...page, trashed: true }, page.version);
  assert.equal(vault.read(page.id).trashed, true);
  assert.deepEqual(decode(readFileSync(join(vault.root, page.id), 'utf8')).meta.tags, ['perso', 'idée']);
  vault.write(page.id, { ...trashed, trashed: false }, trashed.version);
  assert.equal(vault.read(page.id).content, '## Pensées\n');
});
test('rejects paths, symlinks, invalid schemas and parent cycles', t => {
  const vault = fixture(t), parent = vault.create(blank), child = vault.create({ ...blank, parent: parent.id });
  for (const path of ['../outside.md', '/tmp/a.md', '.secret.md', 'a\\b.md']) assert.throws(() => vault.read(path), VaultError);
  symlinkSync(join(vault.root, parent.id), join(vault.root, 'link.md'));
  assert.throws(() => vault.read('link.md'), VaultError);
  assert.throws(() => vault.write(parent.id, { ...parent, parent: child.id }, parent.version), VaultError);
  assert.throws(() => vault.create({ ...blank, content: 42 }), VaultError);
  assert.throws(() => vault.import('a.md', '---\n- invalid\n---\n'), VaultError);
});
test('local API accepts edits and blocks cross-origin writes', async t => {
  const vault = fixture(t);
  const middleware = vaultMiddleware(vault);
  const server = createServer((req, res) => void middleware(req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}`;
  const created = await fetch(`${url}/api/pages`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: url }, body: JSON.stringify(blank) });
  assert.equal(created.status, 200);
  const list = await fetch(`${url}/api/pages`).then(r => r.json());
  assert.equal(list.length, 1);
  const rejected = await fetch(`${url}/api/pages`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://other.example' }, body: JSON.stringify(blank) });
  assert.equal(rejected.status, 403);
  const invalid = await fetch(`${url}/api/pages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'null' });
  assert.equal(invalid.status, 400);
  const imported = await fetch(`${url}/api/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Note.md', raw: '# Un titre' }) });
  assert.equal(imported.status, 200);
});


test('page order and per-page appearance survive reopening', t => {
  const vault = fixture(t), page = vault.create(blank);
  vault.write(page.id, { ...page, order: 2048, fullWidth: true, smallText: true, font: 'serif' }, page.version);
  const reloaded = new Vault(vault.root).read(page.id);
  assert.equal(reloaded.order, 2048);
  assert.equal(reloaded.fullWidth, true);
  assert.equal(reloaded.smallText, true);
  assert.equal(reloaded.font, 'serif');
  assert.throws(() => vault.write(page.id, { ...reloaded, order: NaN }, reloaded.version), VaultError);
  assert.throws(() => vault.write(page.id, { ...reloaded, font: 'invalid' }, reloaded.version), VaultError);
});
