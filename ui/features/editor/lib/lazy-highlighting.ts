import type { Node } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

type Renderer = typeof import('./syntax-highlighting').highlightDocument;
let render: Renderer | undefined;
let pending: Promise<Renderer> | undefined;
function load() {
  return pending ??= import('./syntax-highlighting').then(module => render = module.highlightDocument).catch(error => { pending = undefined; throw error; });
}
const key = new PluginKey('lazy-highlighting');
const needsColor = (node: Node) => node.type.name === 'codeBlock' && node.textContent.length > 0 && node.attrs.language && node.attrs.language !== 'plaintext';
function decorations(doc: Node, phase?: string) {
  if (render) return render(doc);
  const marks: Decoration[] = [];
  if (phase) doc.descendants((node, pos) => { if (needsColor(node)) marks.push(Decoration.node(pos, pos + node.nodeSize, { 'data-highlight-status': phase })); });
  return DecorationSet.create(doc, marks);
}

export function lazyHighlighting() {
  let phase: string | undefined, cachedPhase: string | undefined, cachedDoc: Node | undefined;
  let cached = DecorationSet.empty;
  return new Plugin({
    key,
    props: { decorations(state) {
      if (cachedDoc !== state.doc || cachedPhase !== phase) {
        cachedDoc = state.doc; cachedPhase = phase; cached = decorations(state.doc, phase);
      }
      return cached;
    } },
    view(view) {
      let destroyed = false, loading = false, attempted = false;
      const ensure = () => {
        if (render || loading || attempted) return;
        let needed = false;
        view.state.doc.descendants(node => { if (needsColor(node)) needed = true; });
        if (!needed) return;
        attempted = true; loading = true;
        // Refresh only the view: a transaction could trigger other plugins that edit the document.
        queueMicrotask(() => {
          if (destroyed) return;
          phase = 'loading'; view.updateState(view.state);
          load().then(() => {
            if (!destroyed) { phase = 'ready'; view.updateState(view.state); }
          }).catch(() => {
            if (!destroyed) { phase = 'error'; view.updateState(view.state); }
          }).finally(() => { loading = false; });
        });
      };
      ensure();
      return { update: ensure, destroy() { destroyed = true; } };
    },
  });
}
