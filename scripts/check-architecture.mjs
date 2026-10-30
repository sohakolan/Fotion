import assert from 'node:assert/strict';
import { builtinModules } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { parse } from '@babel/parser';

const root = resolve(import.meta.dirname, '..');
const feature = path => path.match(/^ui\/features\/([^/]+)\//)?.[1];
const patterns = [
  /^ui\/main\.tsx$/,
  /^ui\/app\/(?:[A-Z][A-Za-z]+\.tsx|styles\/[a-z][a-z-]*\.css)$/,
  /^ui\/kit\/(?:index\.ts|[a-z][a-z-]*\.css)$/,
  /^ui\/kit\/components\/[A-Z][A-Za-z]+\.tsx$/,
  /^ui\/features\/[a-z][a-z-]*\/index\.ts$/,
  /^ui\/features\/[a-z][a-z-]*\/components\/[A-Z][A-Za-z]+\.tsx$/,
  /^ui\/features\/[a-z][a-z-]*\/(?:lib|extensions)\/[a-z][a-z-]*\.ts$/,
  /^engine\/index\.ts$/,
  /^engine\/(?:document|models|pages|operations)\/[a-z][a-z-]*\.ts$/,
  /^engine\/fotionmark\/(?:index|(?:syntax|tree|schema|blocks)\/[a-z][a-z-]*)\.ts$/,
  /^server\/(?:http|storage)\/[a-z][a-z-]*\.ts$/,
];
function allowed(from, to) {
  if (from.startsWith('engine/')) {
    if (!to.startsWith('engine/')) return false;
    // FotionMark is a standalone format layer: it depends on nothing, not even the editor schema.
    if (from.startsWith('engine/fotionmark/')) return to.startsWith('engine/fotionmark/');
    if (from.startsWith('engine/models/')) return to.startsWith('engine/models/');
    if (from.startsWith('engine/pages/')) return /^engine\/(models|pages)\//.test(to);
    if (from.startsWith('engine/operations/')) return /^engine\/(models|operations)\//.test(to);
    return true;
  }
  if (to.startsWith('engine/')) return to === 'engine/index.ts';
  if (from.startsWith('server/storage/')) return to.startsWith('server/storage/');
  if (from.startsWith('server/http/')) return to.startsWith('server/');
  if (!to.startsWith('ui/')) return false;
  // The UI-Kit is the shared design layer: it depends on nothing else, everything may use its public entry.
  if (from.startsWith('ui/kit/')) return to.startsWith('ui/kit/');
  if (to.startsWith('ui/kit/')) return to === 'ui/kit/index.ts' || (from === 'ui/main.tsx' && to.endsWith('.css'));
  const source = feature(from), target = feature(to);
  if (source && to.startsWith('ui/app/')) return false;
  if (source && to === 'ui/main.tsx') return false;
  if (target && source !== target) {
    if (to !== `ui/features/${target}/index.ts`) return false;
    // Pages compose the editor; the editor must remain independent of pages UI.
    if (source && !(source === 'pages' && target === 'editor')) return false;
  }
  return true;
}
assert(allowed('ui/app/App.tsx', 'ui/features/editor/index.ts'));
assert(allowed('ui/features/pages/components/VersionHistory.tsx', 'ui/features/editor/index.ts'));
assert(!allowed('ui/app/App.tsx', 'ui/features/editor/lib/block-move.ts'));
assert(!allowed('ui/features/editor/index.ts', 'ui/features/pages/index.ts'));
assert(!allowed('engine/models/page.ts', 'ui/app/App.tsx'));
assert(allowed('ui/app/App.tsx', 'engine/index.ts'));
assert(!allowed('ui/app/App.tsx', 'engine/document/blocks.ts'));
assert(!allowed('engine/document/blocks.ts', 'server/storage/vault.ts'));
assert(!allowed('engine/models/page.ts', 'engine/document/blocks.ts'));
assert(allowed('server/storage/vault.ts', 'engine/index.ts'));
assert(!allowed('server/storage/vault.ts', 'engine/models/page.ts'));
assert(!allowed('server/storage/vault.ts', 'server/http/vault-middleware.ts'));
assert(!allowed('server/http/vault-middleware.ts', 'ui/main.tsx'));
assert(!allowed('ui/features/editor/index.ts', 'server/storage/vault.ts'));
assert(allowed('ui/features/editor/components/DocumentEditor.tsx', 'ui/kit/index.ts'));
assert(!allowed('ui/features/editor/components/DocumentEditor.tsx', 'ui/kit/components/Menu.tsx'));
assert(!allowed('ui/kit/components/Menu.tsx', 'ui/features/editor/index.ts'));
assert(!allowed('engine/fotionmark/syntax/directives.ts', 'engine/document/blocks.ts'));
assert(allowed('engine/document/columns.ts', 'engine/fotionmark/index.ts'));
assert(!patterns.some(pattern => pattern.test('ui/helpers.ts')));

const walk = directory => readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap(entry => {
  const path = `${directory}/${entry.name}`;
  return entry.isDirectory() ? walk(path) : [path];
});
const errors = [];
const files = ['ui', 'engine', 'server'].flatMap(walk);
for (const file of files) {
  if (!patterns.some(pattern => pattern.test(file))) errors.push(`${file}: emplacement ou nom non autorisé`);
  if (!/\.tsx?$/.test(file)) continue;
  const source = parse(readFileSync(resolve(root, file), 'utf8'), { sourceType: 'module', plugins: ['typescript', 'jsx'], createImportExpressions: true });
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (file.startsWith('engine/') && node.type === 'Identifier' && ['window', 'localStorage', 'sessionStorage', 'navigator', 'fetch'].includes(node.name)) errors.push(`${file}: état de navigateur ou réseau interdit dans le moteur (${node.name})`);
    if (file.startsWith('engine/') && node.type === 'ObjectMethod' && node.key?.name === 'addNodeView') errors.push(`${file}: les vues interactives appartiennent à ui/`);
    const specifier = ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].includes(node.type) ? node.source
      : node.type === 'CallExpression' && node.callee?.name === 'require' ? node.arguments[0] : undefined;
    if (specifier?.type === 'StringLiteral') {
      const name = specifier.value;
      if (name.startsWith('.')) {
        const base = relative(root, resolve(dirname(resolve(root, file)), name));
        const target = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find(path => files.includes(path));
        if (!target || !allowed(file, target)) errors.push(`${file} → ${name}: import local interdit ou introuvable`);
      } else if (file.startsWith('engine/fotionmark/')) {
        errors.push(`${file} → ${name}: FotionMark reste sans dépendance externe`);
      } else if ((file.startsWith('ui/') || file.startsWith('engine/')) && (name.startsWith('node:') || builtinModules.includes(name))) {
        errors.push(`${file}: API Node réservée au serveur (${name})`);
      } else if (file.startsWith('engine/') && /^(solid-js|lucide-solid)(\/|$)/.test(name)) {
        errors.push(`${file}: dépendance d’interface interdite dans le moteur (${name})`);
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
