import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, renameSync, lstatSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parse, stringify } from 'yaml';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Page, PageEdit } from '../src/types.ts';
import { seeds } from './seed.ts';

export class VaultError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const digest = (text: string) => createHash('sha256').update(text).digest('hex');

export function decode(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const meta = match ? parse(match[1]) : {};
  if (meta !== null && (typeof meta !== 'object' || Array.isArray(meta))) throw new VaultError(422, 'Les propriétés Markdown doivent être un objet YAML.');
  return { meta: meta || {}, content: match ? raw.slice(match[0].length).replace(/^\r?\n/, '') : raw };
}

export class Vault {
  root: string;
  constructor(root: string, seed = false) {
    this.root = resolve(root);
    mkdirSync(this.root, { recursive: true });
    if (seed && readdirSync(this.root).length === 0) {
      for (const page of seeds) {
        const { id, content, ...meta } = page;
        writeFileSync(join(this.root, id), `---\n${stringify(meta)}---\n\n${content}`, { flag: 'wx' });
      }
    }
  }
  path(id: string) {
    if (!id || id.startsWith('.') || /[/\\\x00-\x1f]/.test(id) || !id.endsWith('.md') || id.length > 220) throw new VaultError(400, 'Nom de fichier invalide.');
    const path = join(this.root, id);
    if (existsSync(path) && (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink())) throw new VaultError(400, 'Seuls les fichiers Markdown ordinaires sont acceptés.');
    return path;
  }
  read(id: string): Page {
    const path = this.path(id);
    if (!existsSync(path)) throw new VaultError(404, 'Page introuvable.');
    const raw = readFileSync(path, 'utf8');
    const { meta, content } = decode(raw);
    return { id, fullWidth: meta.fullWidth === true, smallText: meta.smallText === true, font: ['serif', 'mono'].includes(meta.font) ? meta.font : 'default', order: typeof meta.order === 'number' && Number.isFinite(meta.order) ? meta.order : 0, title: typeof meta.title === 'string' ? meta.title : id.slice(0, -3), icon: typeof meta.icon === 'string' ? meta.icon : '📄', parent: typeof meta.parent === 'string' ? meta.parent : null, favorite: meta.favorite === true, cover: typeof meta.cover === 'string' ? meta.cover : '', trashed: meta.trashed === true, content, version: digest(raw), updated: statSync(path).mtime.toISOString() };
  }
  list() {
    return readdirSync(this.root, { withFileTypes: true }).filter(f => f.isFile() && !f.name.startsWith('.') && f.name.endsWith('.md')).map(f => this.read(f.name));
  }
  validate(value: unknown): asserts value is PageEdit {
    if (!value || typeof value !== 'object') throw new VaultError(400, 'Page invalide.');
    const v = value as PageEdit;
    if ((v.font !== undefined && !['default', 'serif', 'mono'].includes(v.font)) || (v.fullWidth !== undefined && typeof v.fullWidth !== 'boolean') || (v.smallText !== undefined && typeof v.smallText !== 'boolean')) throw new VaultError(400, 'Présentation de page invalide.');
    if (v.order !== undefined && (typeof v.order !== 'number' || !Number.isFinite(v.order))) throw new VaultError(400, 'Ordre de page invalide.');
    if (typeof v.title !== 'string' || v.title.length > 300 || typeof v.content !== 'string' || v.content.length > 2_000_000 || typeof v.icon !== 'string' || v.icon.length > 40 || typeof v.cover !== 'string' || !['', 'landscape', 'sand', 'blue', 'sage', 'rose'].includes(v.cover) || typeof v.favorite !== 'boolean' || typeof v.trashed !== 'boolean' || !(v.parent === null || typeof v.parent === 'string')) throw new VaultError(400, 'Propriétés de page invalides.');
  }
  write(id: string, value: unknown, version: string | null) {
    this.validate(value);
    const path = this.path(id);
    const raw = existsSync(path) ? readFileSync(path, 'utf8') : null;
    if ((raw === null ? null : digest(raw)) !== version) throw new VaultError(409, 'Ce fichier a changé sur le disque. Exportez votre version avant de recharger la page.');
    if (value.parent) {
      let parent: string | null = value.parent;
      const visited = new Set([id]);
      while (parent) {
        if (visited.has(parent)) throw new VaultError(400, 'Une page ne peut pas contenir son propre parent.');
        visited.add(parent);
        parent = this.read(parent).parent;
      }
    }
    const meta = raw === null ? {} : decode(raw).meta;
    const { content, title, icon, parent, favorite, cover, trashed, order, fullWidth, smallText, font } = value;
    const properties = { title, icon, parent, favorite, cover, trashed, ...(order !== undefined ? { order } : {}), ...(fullWidth !== undefined ? { fullWidth } : {}), ...(smallText !== undefined ? { smallText } : {}), ...(font !== undefined ? { font } : {}) };
    const output = `---\n${stringify({ ...meta, ...properties })}---\n\n${content}`;
    const backup = join(this.root, '.history');
    if (raw !== null) {
      mkdirSync(backup, { recursive: true });
      if (lstatSync(backup).isSymbolicLink()) throw new VaultError(400, 'Dossier de sauvegarde invalide.');
      const original = join(backup, `${digest(id).slice(0, 16)}.${version}.md`);
      if (!existsSync(original)) writeFileSync(original, raw, { flag: 'wx' });
    }
    const temp = join(this.root, `.${randomUUID()}.tmp`);
    writeFileSync(temp, output, { flag: 'wx' });
    renameSync(temp, path);
    return this.read(id);
  }
  create(value: unknown) { return this.write(`${randomUUID()}.md`, value, null); }
  import(name: unknown, raw: unknown) {
    if (typeof name !== 'string' || !/\.(md|markdown)$/i.test(name) || typeof raw !== 'string' || Buffer.byteLength(raw) > 2_000_000) throw new VaultError(400, 'Fichier Markdown invalide (2 Mo maximum).');
    decode(raw);
    const id = `${randomUUID()}.md`;
    const parsed = decode(raw);
    const text = `---\n${stringify({ ...parsed.meta, title: parsed.meta.title || name.replace(/\.(md|markdown)$/i, ''), parent: null, trashed: false })}---\n\n${parsed.content}`;
    writeFileSync(this.path(id), text, { flag: 'wx' });
    return this.read(id);
  }
}

export function vaultMiddleware(vault: Vault) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return next();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    try {
      const host = req.headers.host || '';
      if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) || (req.headers.origin && req.headers.origin !== `http://${host}`)) throw new VaultError(403, 'Accès local uniquement.');
      if (url.pathname === '/api/pages' && req.method === 'GET') { res.end(JSON.stringify(vault.list())); return; }
      if (!['POST', 'PUT'].includes(req.method || '') || !/^\/api\/(?:pages(?:\/[^/]+)?|import)$/.test(url.pathname)) throw new VaultError(404, 'Route introuvable.');
      if (!req.headers['content-type']?.startsWith('application/json')) throw new VaultError(415, 'Un contenu JSON est requis.');
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 2_100_000) throw new VaultError(413, 'Document trop volumineux.');
      }
      let data;
      try { data = JSON.parse(body); } catch { throw new VaultError(400, 'JSON invalide.'); }
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new VaultError(400, 'Objet JSON requis.');
      let result;
      if (req.method === 'POST' && url.pathname === '/api/import') result = vault.import(data.name, data.raw);
      else if (req.method === 'POST' && url.pathname === '/api/pages') result = vault.create(data);
      else if (req.method === 'PUT' && url.pathname.startsWith('/api/pages/')) result = vault.write(decodeURIComponent(url.pathname.slice('/api/pages/'.length)), data, data.version);
      else throw new VaultError(404, 'Route introuvable.');
      res.end(JSON.stringify(result));
    } catch (error) {
      res.statusCode = error instanceof VaultError ? error.status : 500;
      res.end(JSON.stringify({ error: error instanceof VaultError ? error.message : 'Impossible de lire ou d’enregistrer le fichier. Vérifiez le dossier vault.' }));
    }
  };
}
