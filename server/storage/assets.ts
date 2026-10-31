import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { VaultError } from './vault.ts';

export const maxAssetBytes = 50 * 1024 * 1024;
// Only these types are shown inline; anything else (HTML, SVG, scripts…) is served as a download.
const inline: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/mp4',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', flac: 'audio/flac',
  pdf: 'application/pdf',
};
const extension = (name: string) => name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';

export interface StoredAsset { path: string; name: string; size: number; type: string }

/**
 * Files imported into pages, kept as ordinary files in `<vault>/attachments/` so Markdown can reference them
 * with a relative path (`attachments/…`) that Obsidian also opens. Names start with a content hash: importing the
 * same file twice stores it once, and two different files never overwrite each other.
 */
export class AssetStore {
  readonly root: string;
  constructor(vaultRoot: string) { this.root = join(vaultRoot, 'attachments'); }

  private folder() {
    if (existsSync(this.root) && (!lstatSync(this.root).isDirectory() || lstatSync(this.root).isSymbolicLink())) throw new VaultError(400, 'Dossier des fichiers invalide.');
    mkdirSync(this.root, { recursive: true });
    return this.root;
  }

  save(name: string, bytes: Buffer): StoredAsset {
    if (!bytes.length) throw new VaultError(400, 'Fichier vide.');
    if (bytes.length > maxAssetBytes) throw new VaultError(413, 'Fichier trop volumineux (50 Mo maximum).');
    const clean = name.normalize('NFC').split(/[/\\]/).pop()!.replace(/[/\\:*?"<>|\x00-\x1f]/g, '-').replace(/^\.+/, '').slice(-120) || 'fichier';
    const file = `${createHash('sha256').update(bytes).digest('hex').slice(0, 12)}-${clean}`;
    const path = join(this.folder(), file);
    if (!existsSync(path)) writeFileSync(path, bytes, { flag: 'wx' });
    return { path: `attachments/${file}`, name: clean, size: bytes.length, type: inline[extension(clean)] || 'application/octet-stream' };
  }

  read(file: string) {
    if (!file || file.startsWith('.') || /[/\\\x00-\x1f]/.test(file) || file.length > 200) throw new VaultError(400, 'Nom de fichier invalide.');
    const path = join(this.root, file);
    if (!existsSync(path)) throw new VaultError(404, 'Fichier introuvable.');
    const info = lstatSync(path);
    if (!info.isFile() || info.isSymbolicLink()) throw new VaultError(400, 'Seuls les fichiers ordinaires sont servis.');
    const type = inline[extension(file)];
    return { bytes: readFileSync(path), type: type || 'application/octet-stream', download: !type };
  }
}
