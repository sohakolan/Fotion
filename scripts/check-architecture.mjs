import assert from 'node:assert/strict';
import { builtinModules } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { parse } from '@babel/parser';

const root = resolve(import.meta.dirname, '..');
const feature = path => path.match(/^src\/features\/([^/]+)\//)?.[1];
const patterns = [
  /^src\/main\.tsx$/,
  /^src\/app\/(?:[A-Z][A-Za-z]+\.tsx|[a-z][a-z-]*\.css)$/,
  /^src\/features\/[a-z][a-z-]*\/index\.ts$/,
  /^src\/features\/[a-z][a-z-]*\/components\/[A-Z][A-Za-z]+\.tsx$/,
  /^src\/features\/[a-z][a-z-]*\/(?:lib|extensions)\/[a-z][a-z-]*\.ts$/,
  /^shared\/[a-z][a-z-]*\.ts$/,
  /^server\/(?:http|storage)\/[a-z][a-z-]*\.ts$/,
];
function allowed(from, to) {
  if (from.startsWith('shared/')) return to.startsWith('shared/');
  if (from.startsWith('server/storage/')) return /^(shared|server\/storage)\//.test(to);
  if (from.startsWith('server/http/')) return /^(shared|server)\//.test(to);
  if (!to.startsWith('src/') && !to.startsWith('shared/')) return false;
  const source = feature(from), target = feature(to);
  if (source && to.startsWith('src/app/')) return false;
  if (source && to === 'src/main.tsx') return false;
  if (target && source !== target) {
    if (to !== `src/features/${target}/index.ts`) return false;
    // Pages compose the editor; the editor must remain independent of pages UI.
    if (source && !(source === 'pages' && target === 'editor')) return false;
  }
  return true;
}
assert(allowed('src/app/App.tsx', 'src/features/editor/index.ts'));
assert(allowed('src/features/pages/components/VersionHistory.tsx', 'src/features/editor/index.ts'));
assert(!allowed('src/app/App.tsx', 'src/features/editor/lib/block-move.ts'));
assert(!allowed('src/features/editor/index.ts', 'src/features/pages/index.ts'));
assert(!allowed('shared/page.ts', 'src/app/App.tsx'));
assert(!allowed('server/storage/vault.ts', 'server/http/vault-middleware.ts'));
assert(!allowed('server/http/vault-middleware.ts', 'src/main.tsx'));
assert(!allowed('src/features/editor/index.ts', 'server/storage/vault.ts'));
assert(!patterns.some(pattern => pattern.test('src/helpers.ts')));

const walk = directory => readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap(entry => {
  const path = `${directory}/${entry.name}`;
  return entry.isDirectory() ? walk(path) : [path];
});
const errors = [];
const files = ['src', 'shared', 'server'].flatMap(walk);
for (const file of files) {
  if (!patterns.some(pattern => pattern.test(file))) errors.push(`${file}: emplacement ou nom non autorisé`);
  if (!/\.tsx?$/.test(file)) continue;
  const source = parse(readFileSync(resolve(root, file), 'utf8'), { sourceType: 'module', plugins: ['typescript', 'jsx'], createImportExpressions: true });
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    const specifier = ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].includes(node.type) ? node.source
      : node.type === 'CallExpression' && node.callee?.name === 'require' ? node.arguments[0] : undefined;
    if (specifier?.type === 'StringLiteral') {
      const name = specifier.value;
      if (name.startsWith('.')) {
        const base = relative(root, resolve(dirname(resolve(root, file)), name));
        const target = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find(path => files.includes(path));
        if (!target || !allowed(file, target)) errors.push(`${file} → ${name}: import local interdit ou introuvable`);
      } else if ((file.startsWith('src/') || file.startsWith('shared/')) && (name.startsWith('node:') || builtinModules.includes(name))) {
        errors.push(`${file}: API Node réservée au serveur (${name})`);
      } else if (name.startsWith('/') || name.startsWith('#') || name.startsWith('@/')) {
        errors.push(`${file}: utiliser un import relatif pour les modules locaux (${name})`);
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'comments', 'tokens'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(source);
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Architecture vérifiée : ${files.length} fichiers, frontières et conventions respectées.`);
