import { imageExtension } from '../../../../engine';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const widthSvgs: Record<string, string> = {
  full: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="2" y="6" width="16" height="8" rx="1.5" fill="currentColor"/></svg>',
  medium: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="8" y="6" width="10" height="8" rx="1.5" fill="currentColor"/><rect x="3.2" y="6" width="2.4" height="8" rx="1" fill="currentColor" opacity="0.55"/></svg>',
  small: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="13" y="6" width="5" height="8" rx="1.2" fill="currentColor"/><rect x="3.2" y="6" width="2.4" height="8" rx="1" fill="currentColor" opacity="0.55"/></svg>',
  // Square with lines above and below, like the reference alignment control.
  align: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M3 5h14M3 8h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M5 11h13M7 14h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>',
  // Square with lines underneath, like the reference caption control.
  caption: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="3.5" y="5" width="13" height="8" rx="1.2" fill="currentColor"/><path d="M3.5 15.5h13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  original: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M7.5 12.5 12.5 7.5M9 6h5v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>',
};

/** Width presets echo the reference row above the image: full column, centered medium, centered small. */
const widthPresets: Array<{ value: number | null; id: string; label: string }> = [
  { value: null, id: 'full', label: 'Pleine largeur' },
  { value: 65, id: 'medium', label: 'Largeur moyenne' },
  { value: 40, id: 'small', label: 'Petite largeur' },
];

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
      frame.append(overlay, image);
      dom.append(frame);
      // Reference control row shown on hover, above the frame.
      const controls = document.createElement('div'); controls.className = 'image-controls'; controls.contentEditable = 'false';
      controls.setAttribute('role', 'toolbar'); controls.setAttribute('aria-label', 'Contrôles de l’image');
      const setNodeAttrs = (attrs: Record<string, unknown>) => {
        const pos = getPos(); if (typeof pos !== 'number') return;
        const live = editor.state.doc.nodeAt(pos); if (live?.type.name !== 'image') return;
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...live.attrs, ...attrs }));
      };
      const presetButtons = widthPresets.map(preset => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'image-width-' + preset.id;
        button.innerHTML = widthSvgs[preset.id];
        button.setAttribute('aria-label', preset.label);
        button.disabled = !editor.isEditable;
        button.addEventListener('click', event => {
          event.preventDefault(); event.stopPropagation();
          setNodeAttrs({ width: preset.value });
        });
        return button;
      });
      // Alignment cycles left → center → right, like the reference alignment control.
      const alignButton = document.createElement('button');
      alignButton.type = 'button'; alignButton.innerHTML = widthSvgs.align;
      alignButton.disabled = !editor.isEditable;
      alignButton.setAttribute('aria-label', 'Aligner l’image');
      alignButton.setAttribute('aria-expanded', 'true'); // opens the wheel of the three options
      alignButton.addEventListener('click', event => {
        event.preventDefault(); event.stopPropagation();
        const order = ['left', 'right', 'center'];
        const from = (current.attrs.align as string) || 'center';
        const next = order[(order.indexOf(from) + 1) % order.length];
        setNodeAttrs({ align: next });
      });
      const captionButton = document.createElement('button');
      captionButton.type = 'button'; captionButton.innerHTML = widthSvgs.caption;
      captionButton.disabled = !editor.isEditable;
      captionButton.setAttribute('aria-label', 'Ajouter ou modifier la légende');
      captionButton.addEventListener('click', event => {
        event.preventDefault(); event.stopPropagation();
        const pos = getPos(); if (typeof pos !== 'number') return;
        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.near(editor.state.doc.resolve(pos + 1))));
        editor.view.focus();
      });
      const original = document.createElement('a'); original.innerHTML = widthSvgs.original;
      original.className = 'image-original'; original.target = '_blank'; original.rel = 'noopener';
      original.setAttribute('aria-label', 'Afficher l’original');
      original.href = (node.attrs.src as string) || '#';
      controls.append(alignButton, ...presetButtons, captionButton, original);
      dom.append(controls);
      const caption = document.createElement('figcaption'); caption.className = 'image-caption'; dom.append(caption);
      image.src = (node.attrs.src as string) || '';
      image.alt = (node.attrs.alt as string) || '';
      const applyWidth = () => {
        const width = typeof current.attrs.width === 'number' ? current.attrs.width : null;
        dom.style.width = width ? `${width}%` : '';
        dom.classList.toggle('image-align-left', current.attrs.align === 'left');
        dom.classList.toggle('image-align-right', current.attrs.align === 'right');
      };
      const refresh = () => {
        applyWidth();
        const width = typeof current.attrs.width === 'number' ? current.attrs.width : null;
        for (const [index, preset] of widthPresets.entries()) presetButtons[index].setAttribute('aria-pressed', String((preset.value ?? null) === (width ?? null)));
        original.href = (current.attrs.src as string) || '#';
        alignButton.title = current.attrs.align === 'left' ? 'Aligné à gauche' : current.attrs.align === 'right' ? 'Aligné à droite' : 'Aligné au centre';
      };
      refresh();
      // Reference resizing: black guides on the left and right edges, width follows the dragged side.
      let dragging: { startX: number; startPx: number; side: 'left' | 'right'; width: number } | undefined;
      const onMove = (event: PointerEvent) => {
        if (!dragging) return;
        const contentWidth = (dom.closest('.prose') as HTMLElement | null)?.clientWidth || 720;
        const delta = (event.clientX - dragging.startX) * (dragging.side === 'right' ? 1 : -1);
        const width = Math.max(100, Math.min(dragging.startPx + delta, contentWidth));
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
      for (const side of ['left', 'right'] as const) {
        const edge = document.createElement('button');
        edge.type = 'button'; edge.className = `image-resize image-resize-${side}`;
        edge.disabled = !editor.isEditable;
        edge.setAttribute('aria-label', `Redimensionner l’image par le côté ${side === 'left' ? 'gauche' : 'droit'}`);
        edge.addEventListener('pointerdown', event => {
          if (!editor.isEditable || event.button !== 0) return;
          event.preventDefault(); event.stopPropagation();
          edge.setPointerCapture(event.pointerId);
          dragging = { startX: event.clientX, startPx: frame.getBoundingClientRect().width, side, width: frame.getBoundingClientRect().width };
          dom.classList.add('image-resizing');
        });
        dom.append(edge);
      }
      // The frame stops events for the caption logic; explicit clicks on the image select the node like a cover.
      image.addEventListener('click', event => {
        event.preventDefault();
        const pos = getPos(); if (typeof pos !== 'number') return;
        editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)));
      });
      // Notion opens the image full-size; the lightbox also hosts Télécharger and Remplacer.
      const requestReplace = (): number | undefined => { const pos = getPos(); return typeof pos === 'number' ? pos : undefined; };
      const openLightbox = () => {
        const viewer = document.createElement('div'); viewer.className = 'image-viewer';
        const shown = document.createElement('img'); shown.src = image.src; shown.alt = image.alt;
        const bar = document.createElement('div'); bar.className = 'image-viewer-bar';
        const download = document.createElement('a'); download.className = 'kit-button'; download.textContent = 'Télécharger';
        download.href = image.src; download.setAttribute('download', image.src.split('/').pop() || 'image'); download.rel = 'noopener';
        const replace = document.createElement('button'); replace.type = 'button'; replace.className = 'kit-button'; replace.textContent = 'Remplacer';
        const close = document.createElement('button'); close.type = 'button'; close.className = 'icon-button image-viewer-close'; close.innerHTML = '&times;'; close.setAttribute('aria-label', 'Fermer l’aperçu');
        const shut = () => { viewer.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); shut(); } };
        replace.addEventListener('click', () => { const pos = requestReplace(); shut(); if (pos !== undefined) window.dispatchEvent(new CustomEvent('fotion-replace-image', { detail: pos })); });
        close.addEventListener('click', shut);
        viewer.addEventListener('click', event => { if (event.target === viewer) shut(); });
        bar.append(replace, download, close);
        viewer.append(shown, bar);
        document.body.append(viewer);
        document.addEventListener('keydown', onKey);
        const focusable = viewer.querySelector('img');
        focusable?.setAttribute('tabindex', '0');
        focusable?.focus();
      };
      image.addEventListener('dblclick', event => {
        event.preventDefault();
        openLightbox();
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
      // Notion flips the strip below the image when there is no room above, near the topbar or the title.
      const placeControls = () => { if (dom.matches(':hover')) dom.classList.toggle('image-controls-below', dom.getBoundingClientRect().top < 120); };
      dom.addEventListener('pointerenter', placeControls);
      window.addEventListener('scroll', placeControls, true);
      return {
        dom, contentDOM: caption,
        update(updated) { if (updated.type.name !== 'image') return false; current = updated; image.src = (current.attrs.src as string) || ''; image.alt = (current.attrs.alt as string) || ''; refresh(); syncOverlay(); return true; },
        stopEvent: event => event.target instanceof Node && (image.contains(event.target) || overlay.contains(event.target) || controls.contains(event.target) || dom.classList.contains('image-resizing')),
        // Only the caption stays live: any other mutation comes from this view itself and must not rebuild it.
        ignoreMutation: mutation => !caption.contains(mutation.target as Node) || mutation.target !== caption,
        destroy() { overlayWatcher?.disconnect(); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('scroll', placeControls, true); dom.removeEventListener('pointerenter', placeControls); },
      };
    };
  },
});
