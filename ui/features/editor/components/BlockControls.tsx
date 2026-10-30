import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import type { Editor } from '@tiptap/core';
import { GripVertical, Plus } from 'lucide-solid';
import { blockAt, moveBlockTransaction, type Block } from '../../../../engine';
import { Tooltip, altKey } from '../../../kit';

type PositionedBlock = Block & { element: HTMLElement; left: number; top: number };
export default function BlockControls(props: { editor: Editor; onMenu: (block: Block, x: number, y: number) => void; onAdd: (block: Block, above: boolean) => void }) {
  const [hovered, setHovered] = createSignal<PositionedBlock>();
  const [drag, setDrag] = createSignal<{ text: string; x: number; y: number }>();
  const [line, setLine] = createSignal<{ x: number; y: number; width: number }>();
  let source: PositionedBlock | undefined;
  let target: { block: Block; after: boolean } | undefined;
  let startX = 0, startY = 0, pointerX = 0, pointerY = 0;
  let dragging = false, suppressClick = false;
  let frame = 0;
  let startDoc = props.editor.state.doc;
  const root = () => props.editor.view.dom;
  function findBlock(element: HTMLElement): PositionedBlock | undefined {
    const container = root();
    let blockElement = element.closest<HTMLElement>('li');
    if (!blockElement || !container.contains(blockElement)) {
      blockElement = element;
      while (blockElement.parentElement && blockElement.parentElement !== container) blockElement = blockElement.parentElement;
      if (blockElement.parentElement !== container) return;
    }
    const position = props.editor.view.posAtDOM(blockElement, 0);
    const block = blockAt(props.editor.state.doc, position);
    if (!block) return;
    const rect = blockElement.getBoundingClientRect();
    return { ...block, element: blockElement, left: container.getBoundingClientRect().left - 48, top: rect.top };
  }
  function pickTarget(x: number, y: number) {
    const bounds = root().getBoundingClientRect();
    const scroll = root().closest('.main-scroll')!.getBoundingClientRect();
    if (x < bounds.left - 65 || x > bounds.right + 40 || y < scroll.top || y > scroll.bottom) { target = undefined; setLine(undefined); return; }
    const hit = document.elementFromPoint(Math.max(bounds.left + 5, Math.min(x, bounds.right - 5)), y) as HTMLElement | null;
    let block = hit && root().contains(hit) ? findBlock(hit) : undefined;
    if (!block) {
      const elements = [...root().children] as HTMLElement[];
      const closest = elements.reduce<HTMLElement | undefined>((best, el) => !best || Math.abs(el.getBoundingClientRect().top - y) < Math.abs(best.getBoundingClientRect().top - y) ? el : best, undefined);
      if (closest) block = findBlock(closest);
    }
    if (!block || !source) return;
    const rect = block.element.getBoundingClientRect();
    const after = y > (rect.top + rect.bottom) / 2;
    if (!moveBlockTransaction(props.editor.state, source, block, after)) { target = undefined; setLine(undefined); return; }
    target = { block, after };
    setLine({ x: rect.left, y: (after ? rect.bottom : rect.top) + (after ? 3 : -3), width: rect.width });
  }
  function autoScroll() {
    if (!dragging) return;
    const scroller = root().closest('.main-scroll')!;
    const rect = scroller.getBoundingClientRect();
    const speed = pointerY < rect.top + 60 ? -Math.min(18, (rect.top + 60 - pointerY) / 3) : pointerY > rect.bottom - 60 ? Math.min(18, (pointerY - rect.bottom + 60) / 3) : 0;
    if (speed) { scroller.scrollTop += speed; pickTarget(pointerX, pointerY); }
    frame = requestAnimationFrame(autoScroll);
  }
  function reset() {
    cancelAnimationFrame(frame);
    source?.element.classList.remove('block-drag-source');
    document.body.classList.remove('block-dragging');
    source = undefined; target = undefined; dragging = false;
    setDrag(undefined); setLine(undefined); setHovered(undefined);
  }
  function start(event: PointerEvent) {
    if (event.button !== 0 || !hovered()) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    source = hovered(); startDoc = props.editor.state.doc;
    startX = pointerX = event.clientX; startY = pointerY = event.clientY;
    suppressClick = false;
  }
  onMount(() => {
    const scroller = root().closest('.main-scroll');
    const hover = (event: MouseEvent) => {
      if (source || !(event.target instanceof HTMLElement)) return;
      if (event.target.closest('.block-controls, .block-menu, .block-submenu')) return;
      const bounds = root().getBoundingClientRect();
      if (event.clientX < bounds.left - 55 || event.clientX > bounds.right + 10) { setHovered(undefined); return; }
      const hit = document.elementFromPoint(Math.max(bounds.left + 5, event.clientX), event.clientY);
      if (hit instanceof HTMLElement && root().contains(hit)) setHovered(findBlock(hit));
      else setHovered(undefined);
    };
    const move = (event: PointerEvent) => {
      if (!source) return;
      pointerX = event.clientX; pointerY = event.clientY;
      if (!dragging && Math.hypot(pointerX - startX, pointerY - startY) < 6) return;
      event.preventDefault();
      if (props.editor.state.doc !== startDoc) { reset(); return; }
      if (!dragging) {
        dragging = true; suppressClick = true;
        source.element.classList.add('block-drag-source');
        document.body.classList.add('block-dragging');
        frame = requestAnimationFrame(autoScroll);
      }
      setDrag({ text: source.node.textContent.slice(0, 80) || 'Bloc vide', x: pointerX + 15, y: pointerY + 15 });
      pickTarget(pointerX, pointerY);
    };
    const finish = () => {
      if (dragging && source && target && props.editor.state.doc === startDoc) {
        const tr = moveBlockTransaction(props.editor.state, source, target.block, target.after);
        if (tr) props.editor.view.dispatch(tr);
      }
      // Keep the hovered block for a simple click; a drag must never open the block menu.
      if (!dragging) source = undefined;
      else reset();
    };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') reset(); };
    const scroll = () => { if (!dragging) setHovered(undefined); };
    document.addEventListener('mousemove', hover);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', reset);
    window.addEventListener('blur', reset);
    window.addEventListener('keydown', escape);
    scroller?.addEventListener('scroll', scroll);
    onCleanup(() => { reset(); document.removeEventListener('mousemove', hover); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', finish); window.removeEventListener('pointercancel', reset); window.removeEventListener('blur', reset); window.removeEventListener('keydown', escape); scroller?.removeEventListener('scroll', scroll); });
  });
  return <>
    <Show when={hovered()}>{block => <div class="block-controls" style={{ left: `${block().left}px`, top: `${block().top}px` }}>
      <button class="block-add" aria-label="Ajouter un bloc en dessous" onMouseDown={e => e.preventDefault()} onClick={e => props.onAdd(block(), e.altKey)}><Plus size={18}/><Tooltip><b>Cliquer</b> pour ajouter en dessous<br/><b>{altKey}-clic</b> pour ajouter au-dessus</Tooltip></button>
      <button class="block-grip" aria-label="Déplacer ou modifier le bloc" onPointerDown={start} onClick={() => { if (!suppressClick) props.onMenu(block(), block().left, block().top + 26); }}><GripVertical size={18}/><Tooltip><b>Faire glisser</b> pour déplacer<br/><b>Cliquer</b> pour ouvrir le menu</Tooltip></button>
    </div>}</Show>
    <Show when={line()}>{marker => <div class="block-drop-line" style={{ left: `${marker().x}px`, top: `${marker().y}px`, width: `${marker().width}px` }}/>}</Show>
    <Show when={drag()}>{ghost => <div class="block-drag-preview" style={{ left: `${ghost().x}px`, top: `${ghost().y}px` }}><GripVertical size={15}/>{ghost().text}</div>}</Show>
  </>;
}
