import type { IncomingMessage, ServerResponse } from 'node:http';
import { Vault, VaultError } from '../storage/vault.ts';

export function vaultMiddleware(vault: Vault) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return next();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    try {
      const host = req.headers.host || '';
      if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) || (req.headers.origin && req.headers.origin !== `http://${host}`)) throw new VaultError(403, 'Accès local uniquement.');
      const versions = url.pathname.match(/^\/api\/pages\/([^/]+)\/history(?:\/([^/]+))?$/);
      if (req.method === 'GET' && versions) {
        const id = decodeURIComponent(versions[1]);
        res.end(JSON.stringify(versions[2] ? vault.snapshot(id, versions[2]) : vault.history(id))); return;
      }
      const restore = url.pathname.match(/^\/api\/pages\/([^/]+)\/restore$/);
      if (url.pathname === '/api/pages' && req.method === 'GET') { res.end(JSON.stringify(vault.list())); return; }
      if (!['POST', 'PUT', 'DELETE'].includes(req.method || '') || (!/^\/api\/(?:pages(?:\/[^/]+)?|import)$/.test(url.pathname) && !(req.method === 'POST' && restore))) throw new VaultError(404, 'Route introuvable.');
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
      if (req.method === 'POST' && restore) result = vault.restore(decodeURIComponent(restore[1]), data.snapshotVersion, data.version);
      else if (req.method === 'POST' && url.pathname === '/api/import') result = vault.import(data.name, data.raw);
      else if (req.method === 'POST' && url.pathname === '/api/pages') result = vault.create(data);
      else if (req.method === 'DELETE' && url.pathname.startsWith('/api/pages/')) result = vault.remove(decodeURIComponent(url.pathname.slice('/api/pages/'.length)), data.version);
      else if (req.method === 'PUT' && url.pathname.startsWith('/api/pages/')) result = vault.write(decodeURIComponent(url.pathname.slice('/api/pages/'.length)), data, data.version);
      else throw new VaultError(404, 'Route introuvable.');
      res.end(JSON.stringify(result));
    } catch (error) {
      res.statusCode = error instanceof VaultError ? error.status : 500;
      res.end(JSON.stringify({ error: error instanceof VaultError ? error.message : 'Impossible de lire ou d’enregistrer le fichier. Vérifiez le dossier vault.' }));
    }
  };
}
