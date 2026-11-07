import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, renameSync, lstatSync, statSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parse, stringify } from 'yaml';
import type { Page, PageEdit, PageVersion, PageSnapshot } from '../../engine/index.ts';
import * as FotionMark from '../../engine/fotionmark/index.ts';
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

const reserved = new Set<string>(FotionMark.reservedKeys);
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
/** A YAML value a row may hold: scalars, lists of scalars, or one level of such an object (date ranges). */
const plainValue = (value: unknown, depth = 0): boolean => value === null || ['string', 'number', 'boolean'].includes(typeof value) && (typeof value !== 'number' || Number.isFinite(value)) && (typeof value !== 'string' || value.length <= 10_000)
  || Array.isArray(value) && value.length <= 500 && value.every(item => plainValue(item, 2))
  || depth === 0 && isRecord(value) && Object.keys(value).length <= 20 && Object.values(value).every(item => plainValue(item, 1));

function pageFromRaw(id: string, raw: string, updated: string): Page {
  const { meta, content } = decode(raw);
  const values = Object.fromEntries(Object.entries(meta).filter(([key]) => !reserved.has(key)));
  return { id, fullWidth: meta.fullWidth === true, smallText: meta.smallText === true, locked: meta.locked === true, backlinks: ['expanded', 'off'].includes(meta.backlinks) ? meta.backlinks : 'popover', font: ['serif', 'mono'].includes(meta.font) ? meta.font : 'default', order: typeof meta.order === 'number' && Number.isFinite(meta.order) ? meta.order : 0, title: typeof meta.title === 'string' ? meta.title : id.slice(0, -3), icon: typeof meta.icon === 'string' ? meta.icon : '📄', parent: typeof meta.parent === 'string' ? meta.parent : null, favorite: meta.favorite === true, cover: typeof meta.cover === 'string' ? meta.cover : '', trashed: meta.trashed === true, content, version: digest(raw), updated, values, ...(isRecord(meta.database) ? { database: meta.database } : {}) };
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
    return pageFromRaw(id, raw, statSync(path).mtime.toISOString());
  }
  list() {
    return readdirSync(this.root, { withFileTypes: true }).filter(f => f.isFile() && !f.name.startsWith('.') && f.name.endsWith('.md')).map(f => this.read(f.name));
  }
  private historyRoot() {
    const root = join(this.root, '.history');
    if (existsSync(root) && (!lstatSync(root).isDirectory() || lstatSync(root).isSymbolicLink())) throw new VaultError(400, 'Dossier de sauvegarde invalide.');
    return root;
  }
  history(id: string): PageVersion[] {
    this.read(id);
    const root = this.historyRoot();
    if (!existsSync(root)) return [];
    const prefix = `${digest(id).slice(0, 16)}.`;
    return readdirSync(root, { withFileTypes: true }).filter(file => file.isFile() && file.name.startsWith(prefix) && /^[a-f0-9]{16}\.[a-f0-9]{64}\.md$/.test(file.name)).map(file => {
      const info = lstatSync(join(root, file.name));
      return { version: file.name.slice(prefix.length, -3), savedAt: info.mtime.toISOString(), bytes: info.size };
    }).sort((a, b) => b.savedAt.localeCompare(a.savedAt) || a.version.localeCompare(b.version));
  }
  snapshot(id: string, version: string): PageSnapshot {
    this.read(id);
    if (typeof version !== 'string' || !/^[a-f0-9]{64}$/.test(version)) throw new VaultError(400, 'Version invalide.');
    const path = join(this.historyRoot(), `${digest(id).slice(0, 16)}.${version}.md`);
    if (!existsSync(path)) throw new VaultError(404, 'Version introuvable.');
    const info = lstatSync(path);
    if (!info.isFile() || info.isSymbolicLink()) throw new VaultError(400, 'Fichier de sauvegarde invalide.');
    const raw = readFileSync(path, 'utf8');
    if (digest(raw) !== version) throw new VaultError(422, 'Cette sauvegarde a été modifiée ou endommagée.');
    const savedAt = info.mtime.toISOString();
    return { version, savedAt, bytes: info.size, page: pageFromRaw(id, raw, savedAt) };
  }
  restore(id: string, snapshotVersion: string, currentVersion: string) {
    const previous = this.snapshot(id, snapshotVersion).page;
    const current = this.read(id);
    const { content, title, icon, cover, fullWidth, smallText, font } = previous;
    return this.write(id, { ...current, content, title, icon, cover, fullWidth, smallText, font }, currentVersion);
  }
  validate(value: unknown): asserts value is PageEdit {
    if (!value || typeof value !== 'object') throw new VaultError(400, 'Page invalide.');
    const v = value as PageEdit;
    if ((v.font !== undefined && !['default', 'serif', 'mono'].includes(v.font)) || (v.fullWidth !== undefined && typeof v.fullWidth !== 'boolean') || (v.smallText !== undefined && typeof v.smallText !== 'boolean') || (v.locked !== undefined && typeof v.locked !== 'boolean') || (v.backlinks !== undefined && !['expanded', 'popover', 'off'].includes(v.backlinks))) throw new VaultError(400, 'Présentation de page invalide.');
    if (v.order !== undefined && (typeof v.order !== 'number' || !Number.isFinite(v.order))) throw new VaultError(400, 'Ordre de page invalide.');
    if ((v.values !== undefined && !isRecord(v.values)) || (v.database !== undefined && !isRecord(v.database))) throw new VaultError(400, 'Propriétés de page invalides.');
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
    const stored = raw === null ? {} : decode(raw).meta;
    const { content, title, icon, parent, favorite, cover, trashed, order, fullWidth, smallText, font, locked, backlinks, database, values } = value;
    // Sent values replace every non-reserved key (an emptied cell removes its key); without them, keys stay as they were.
    const meta = values === undefined ? stored : { ...Object.fromEntries(Object.entries(stored).filter(([key]) => reserved.has(key))), ...values };
    // Only what changes is checked: keys written by Obsidian or by hand keep saving even if Fotion would not create them.
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    const changed = Object.entries(values ?? {}).filter(([key, item]) => !same(stored[key], item));
    if (changed.length > 200 || changed.some(([key, item]) => reserved.has(key) || !/^[A-Za-z_][\w-]{0,63}$/.test(key) || !plainValue(item))) throw new VaultError(400, 'Valeurs de propriétés invalides.');
    if (database !== undefined && !same(stored.database, database) && (JSON.stringify(database).length > 100_000 || FotionMark.readDatabase(database)?.problems.length !== 0)) throw new VaultError(400, 'Schéma de base de données invalide.');
    if (database !== undefined) meta.database = database;
    const properties = { title, icon, parent, favorite, cover, trashed, ...(order !== undefined ? { order } : {}), ...(fullWidth !== undefined ? { fullWidth } : {}), ...(smallText !== undefined ? { smallText } : {}), ...(font !== undefined ? { font } : {}), ...(locked !== undefined ? { locked } : {}), ...(backlinks !== undefined ? { backlinks } : {}) };
    const output = `---\n${stringify({ ...meta, ...properties })}---\n\n${content}`;
    if (raw !== null) this.backup(id, raw, version!);
    const temp = join(this.root, `.${randomUUID()}.tmp`);
    writeFileSync(temp, output, { flag: 'wx' });
    renameSync(temp, path);
    return this.read(id);
  }
  /** Keeps the replaced file in the history before it is overwritten or deleted. */
  private backup(id: string, raw: string, version: string) {
    const backup = this.historyRoot();
    mkdirSync(backup, { recursive: true });
    if (lstatSync(backup).isSymbolicLink()) throw new VaultError(400, 'Dossier de sauvegarde invalide.');
    const original = join(backup, `${digest(id).slice(0, 16)}.${version}.md`);
    if (existsSync(original)) {
      const info = lstatSync(original);
      if (!info.isFile() || info.isSymbolicLink() || digest(readFileSync(original, 'utf8')) !== version) throw new VaultError(422, 'La sauvegarde précédente est endommagée. Le fichier actuel n’a pas été remplacé.');
    } else writeFileSync(original, raw, { flag: 'wx' });
  }
  /** Permanently deletes a trashed page; its last content stays in the history folder. */
  remove(id: string, version: unknown) {
    const path = this.path(id);
    if (!existsSync(path)) throw new VaultError(404, 'Page introuvable.');
    const raw = readFileSync(path, 'utf8');
    if (typeof version !== 'string' || digest(raw) !== version) throw new VaultError(409, 'Ce fichier a changé sur le disque. Rechargez avant de le supprimer.');
    if (!this.read(id).trashed) throw new VaultError(400, 'Seules les pages de la corbeille peuvent être supprimées définitivement.');
    this.backup(id, raw, version);
    unlinkSync(path);
    return { id };
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

