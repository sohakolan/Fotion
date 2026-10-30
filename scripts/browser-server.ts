import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preview } from 'vite';
import { Vault } from '../server/storage/vault';

const root = mkdtempSync(join(tmpdir(), 'fotion-browser-test-'));
process.env.FOTION_VAULT = root;
new Vault(root, true);
process.once('exit', () => rmSync(root, { recursive: true, force: true }));
const server = await preview({ preview: { host: '127.0.0.1', port: 5175, strictPort: true } });
const stop = () => { server.httpServer.close(() => process.exit(0)); };
process.once('SIGTERM', stop);
process.once('SIGINT', stop);
