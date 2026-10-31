import { common, createLowlight } from 'lowlight';
import type { LanguageFn } from 'highlight.js';
import type { Node } from '@tiptap/pm/model';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { RootContent } from 'hast';

const lowlight = createLowlight(common);
const cache = new WeakMap<Node, { from: number; to: number; classes: string }[]>();
export { lowlight };

/** Languages outside the common bundle load their grammar once, on first use. */
const extraGrammars: Record<string, () => Promise<{ default: unknown }>> = {
  dart: () => import('highlight.js/lib/languages/dart'),
  dockerfile: () => import('highlight.js/lib/languages/dockerfile'),
  elixir: () => import('highlight.js/lib/languages/elixir'),
  erlang: () => import('highlight.js/lib/languages/erlang'),
  gradle: () => import('highlight.js/lib/languages/gradle'),
  groovy: () => import('highlight.js/lib/languages/groovy'),
  http: () => import('highlight.js/lib/languages/http'),
  julia: () => import('highlight.js/lib/languages/julia'),
  lisp: () => import('highlight.js/lib/languages/lisp'),
  nginx: () => import('highlight.js/lib/languages/nginx'),
  ocaml: () => import('highlight.js/lib/languages/ocaml'),
  powershell: () => import('highlight.js/lib/languages/powershell'),
  protobuf: () => import('highlight.js/lib/languages/protobuf'),
  latex: () => import('highlight.js/lib/languages/latex'),
  properties: () => import('highlight.js/lib/languages/properties'),
  vim: () => import('highlight.js/lib/languages/vim'),
};

const loading = new Set<string>();

/** Registers an extra grammar so the next decoration pass can highlight the block. */
export async function ensureLanguage(language: string) {
  if (!language || lowlight.registered(language) || !extraGrammars[language] || loading.has(language)) return;
  loading.add(language);
  try {
    const module = await extraGrammars[language]();
    lowlight.register(language, module.default as LanguageFn);
  } catch {
    // A grammar that fails to load keeps the block editable, like a missing syntax file.
  } finally {
    loading.delete(language);
  }
}

export function highlightDocument(doc: Node) {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== 'codeBlock') return;
    const language = node.attrs.language;
    if (!language || language === 'plaintext' || !lowlight.registered(language)) return false;
    let ranges = cache.get(node);
    if (!ranges) {
      ranges = [];
      let offset = 0;
      const visit = (children: RootContent[], inherited: string[] = []) => {
        for (const child of children) {
          if (child.type === 'element') {
            const classes = child.properties.className;
            visit(child.children, [...inherited, ...(Array.isArray(classes) ? classes.map(String) : [])]);
          } else if (child.type === 'text') {
            if (inherited.length && child.value.length) ranges!.push({ from: offset, to: offset + child.value.length, classes: inherited.join(' ') });
            offset += child.value.length;
          }
        }
      };
      visit(lowlight.highlight(language, node.textContent).children);
      cache.set(node, ranges);
    }
    for (const range of ranges) decorations.push(Decoration.inline(pos + 1 + range.from, pos + 1 + range.to, { class: range.classes }));
    return false;
  });
  return DecorationSet.create(doc, decorations);
}
