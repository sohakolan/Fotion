import { imageExtension } from '../../../../engine';
import { NodeSelection } from '@tiptap/pm/state';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/** Notion figure: hover reveals a bottom handle that resizes the width, a blue outline marks the selection
 * and the caption sits under the image as a real editor hole (placeholder added by CSS). */
export const ImageView = imageExtension().extend({
  addProseMirrorPlugins() {
    const key = new PluginKey('imageSelectionOutline');
    return [...(this.parent?.() || []), new Plugin({
      key,
      props: {
        decorations(state) {
          if (!(state.selection instanceof NodeSelection)) return null;
          const node = state.selection.node;
          if (node.type.name !== 'image') return null;
          return DecorationSet.create(state.doc, [Decoration.node(state.selection.from, state.selection.to, { class: 'image-selected' })]);
        },
      },
    })];
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current = node;
      const dom = document.createElement('figure'); dom.className = 'image-block';
      const frame = document.createElement('div'); frame.className = 'image-frame'; frame.contentEditable = 'false';
      const image = document.createElement('img'); image.draggable = false; image.loading = 'lazy';
      // Selection ring as a real overlay: replaced images swallow borders and inset shadows.
      const overlay = document.createElement('div'); overlay.className = 'image-outline'; overlay.hidden = true;
      const handle = document.createElement('button'); handle.type = 'button'; handle.className = 'image-resize';
      handle.disabled = !editor.isEditable;
      handle.setAttribute('aria-label', 'Redimensionner l’image');
      frame.append(overlay, image); dom.append(frame, handle);
      const caption = document.createElement('figcaption'); caption.className = 'image-caption'; dom.append(caption);
      image.src = (node.attrs.src as string) || '';
      image.alt = (node.attrs.alt as string) || '';
      const applyWidth = () => { const width = typeof current.attrs.width === 'number' ? current.attrs.width : null; dom.style.width = width ? `${width}%` : ''; };
      refresh();
      function refresh() { applyWidth(); }
      // Live resizing: vertical drag maps to width, the img height follows its own natural ratio.
      let dragging: { startY: number; startPx: number; ratio: number; width: number } | undefined;
      const onMove = (event: PointerEvent) => {
        if (!dragging) return;
        const contentWidth = (dom.closest('.prose') as HTMLElement | null)?.clientWidth || 720;
        const width = Math.max(100, Math.min(dragging.startPx + (event.clientY - dragging.startY) * dragging.ratio, contentWidth));
        dragging.width = width;
        dom.style.width = `${width}px`;
      };
      const onUp = () => {
        if (!dragging) return;
        const { width } = dragging;
        dragging = undefined;
        dom.classList.remove('image-resizing');
        applyWidth();
        const pos = getPos(); if (typeof pos !== 'number') return;
        const live = editor.state.doc.nodeAt(pos); if (live?.type.name !== 'image') return;
        const columnWidth = (dom.closest('.prose') as HTMLElement | null)?.clientWidth || 720;
        const percent = Math.max(15, Math.min(100, Math.round((width / columnWidth) * 100)));
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...live.attrs, width: percent === 100 ? null : percent }));
      };
      handle.addEventListener('pointerdown', event => {
        if (!editor.isEditable || event.button !== 0) return;
        event.preventDefault(); event.stopPropagation();
        handle.setPointerCapture(event.pointerId);
        dragging = { startY: event.clientY, startPx: frame.getBoundingClientRect().width, ratio: image.naturalWidth > 0 && image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : 16 / 9, width: frame.getBoundingClientRect().width };
        dom.classList.add('image-resizing');
      });
      // The frame stops events for the caption logic; explicit clicks on the image select the node like a cover.
      image.addEventListener('click', event => {
        event.preventDefault();
        const pos = getPos(); if (typeof pos !== 'number') return;
        editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)));
      });
      // ProseMirror toggles its own class on the node view; show the overlay from it (a redraw-safe path).
      const overlayWatcher = typeof MutationObserver === 'function' ? new MutationObserver(() => {
        const selected = dom.classList.contains('ProseMirror-selectednode') || dom.classList.contains('image-selected');
        overlay.hidden = !selected;
      }) : null;
      overlayWatcher?.observe(dom, { attributes: true, attributeFilter: ['class'] });
      const syncOverlay = () => { const selected = dom.classList.contains('ProseMirror-selectednode') || dom.classList.contains('image-selected'); overlay.hidden = !selected; };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      return {
        dom, contentDOM: caption,
        update(updated) { if (updated.type.name !== 'image') return false; current = updated; image.src = (current.attrs.src as string) || ''; image.alt = (current.attrs.alt as string) || ''; refresh(); syncOverlay(); return true; },
        stopEvent: event => event.target instanceof Node && (handle.contains(event.target) || image.contains(event.target) || overlay.contains(event.target)),
        // Only the caption stays live: any other mutation comes from this view itself and must not rebuild it.
        ignoreMutation: mutation => !caption.contains(mutation.target as Node) || mutation.target !== caption,
        destroy() { overlayWatcher?.disconnect(); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); },
      };
    };
  },
});
