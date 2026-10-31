import { BlockMath as EngineBlockMath, InlineMath as EngineInlineMath } from '../../../../engine';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

type Katex = typeof import('katex').default;
let katex: Promise<Katex> | undefined;
// KaTeX and its fonts load with the first equation shown, never with the editor.
const loadKatex = () => katex ??= Promise.all([import('katex'), import('katex/dist/katex.min.css')]).then(([module]) => module.default);

async function draw(target: HTMLElement, latex: string, display: boolean) {
  if (!latex.trim()) { target.textContent = display ? 'Ajouter une équation TeX' : 'Équation'; target.classList.add('math-empty'); return; }
  target.classList.remove('math-empty');
  const library = await loadKatex();
  // Invalid TeX is drawn in red by KaTeX instead of breaking the page.
  library.render(latex, target, { displayMode: display, throwOnError: false, errorColor: 'var(--danger)', strict: 'ignore' });
}

function mathView(display: boolean) {
  return ({ node, editor, getPos }: { node: ProseMirrorNode; editor: Editor; getPos: () => number | undefined }) => {
    let current = node;
    const dom = document.createElement(display ? 'div' : 'span');
    dom.className = display ? 'math-block' : 'math-inline'; dom.contentEditable = 'false';
    const output = document.createElement(display ? 'div' : 'span'); output.className = 'math-output';
    dom.append(output);
    let panel: HTMLElement | undefined;
    const close = () => { panel?.remove(); panel = undefined; dom.classList.remove('math-editing'); };
    const save = (latex: string) => {
      const pos = getPos(); close();
      if (typeof pos !== 'number') return;
      // Direct transaction and immediate focus: a delayed focus would override the user's next click.
      const tr = editor.state.tr.setNodeMarkup(pos, undefined, { latex });
      editor.view.dispatch(tr.setSelection(TextSelection.near(tr.doc.resolve(pos + current.nodeSize))));
      editor.view.focus();
    };
    // Notion's equation editor: TeX field, live preview, Cmd/Ctrl+Enter or « Terminé » to apply, Escape to cancel.
    const open = () => {
      if (panel || !editor.isEditable) return;
      dom.classList.add('math-editing');
      panel = document.createElement('div'); panel.className = 'math-editor popover kit-menu';
      const field = document.createElement('textarea'); field.value = current.attrs.latex; field.setAttribute('aria-label', 'Équation TeX'); field.placeholder = 'E = mc^2'; field.rows = display ? 3 : 1;
      const preview = document.createElement('div'); preview.className = 'math-preview';
      const done = document.createElement('button'); done.type = 'button'; done.className = 'kit-button kit-button-primary'; done.textContent = 'Terminé ↵';
      field.addEventListener('input', () => void draw(preview, field.value, display));
      field.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); close(); editor.view.focus(); }
        else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey || !display)) { event.preventDefault(); save(field.value.trim()); }
      });
      done.addEventListener('click', () => save(field.value.trim()));
      panel.append(field, preview, done);
      dom.append(panel);
      void draw(preview, field.value, display);
      field.focus();
    };
    dom.addEventListener('click', event => { if (!panel?.contains(event.target as globalThis.Node)) open(); });
    void draw(output, current.attrs.latex, display);
    // A freshly inserted empty equation opens its editor, as in Notion.
    if (!current.attrs.latex) queueMicrotask(open);
    return {
      dom,
      update(updated: ProseMirrorNode) { if (updated.type !== current.type) return false; if (updated.attrs.latex !== current.attrs.latex) void draw(output, updated.attrs.latex, display); current = updated; return true; },
      stopEvent: (event: Event) => !!panel?.contains(event.target as globalThis.Node),
      ignoreMutation: () => true,
      destroy: close,
    };
  };
}

export const BlockMath = EngineBlockMath.extend({ addNodeView: () => mathView(true) });
export const InlineMath = EngineInlineMath.extend({ addNodeView: () => mathView(false) });
