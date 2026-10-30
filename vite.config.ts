import { vaultMiddleware } from './server/http/vault-middleware.ts';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { Vault } from './server/storage/vault.ts';
const middleware = () => vaultMiddleware(new Vault(process.env.FOTION_VAULT || './vault', !process.env.FOTION_VAULT));
export default defineConfig({
  plugins: [solid(), { name: 'local-markdown-vault', configureServer(server) { server.middlewares.use(middleware()); }, configurePreviewServer(server) { server.middlewares.use(middleware()); } }],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
