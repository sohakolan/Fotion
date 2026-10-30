import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import type { Editor } from '@tiptap/core';
import { BlockSelection } from '../../../../engine';

/**
 * Notion's marquee: dragging from the page margin draws a rectangle and selects every top-level block it touches.
 * Starting on text, controls or form fields keeps the normal behaviour.
 */
export default function SelectionRectangle(props: { editor: Editor }) {
  const [rect, setRect] = createSignal<{ left: number; top: number; width: number; height: number }>();
  onMount(() => {
    const view = props.editor.view;
    const scroller = view.dom.closest<HTMLElement>('.main-scroll');
    let start: { x: number; y: number } | undefined;
    const select = (left: number, top: number, right: number, bottom: number) => {
      const touched: number[] = [];
      view.state.doc.forEach((node, pos) => {
        const element = view.nodeDOM(pos);
        if (!(element instanceof HTMLElement)) return;
        const box = element.getBoundingClientRect();
        if (box.bottom >= top && box.top <= bottom && box.right >= left && box.left <= right) touched.push(pos);
      });
      const selection = touched.length ? BlockSelection.create(view.state.doc, touched[0], touched.at(-1)!) : null;
      if (selection && !selection.eq(view.state.selection)) view.dispatch(view.state.tr.setSelection(selection));
    };
    const down = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (event.button !== 0 || !target.closest('.document') || target.closest('.prose, button, input, textarea, select, a, .popover, .page-title')) return;
      start = { x: event.clientX, y: event.clientY };
    };
    const move = (event: PointerEvent) => {
      if (!start || (!rect() && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 5)) return;
      event.preventDefault();
      const left = Math.min(start.x, event.clientX), top = Math.min(start.y, event.clientY), right = Math.max(start.x, event.clientX), bottom = Math.max(start.y, event.clientY);
      setRect({ left, top, width: right - left, height: bottom - top });
      select(left, top, right, bottom);
    };
    const up = () => {
      if (rect()) view.focus();
      start = undefined; setRect(undefined);
    };
    scroller?.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    onCleanup(() => { scroller?.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); });
  });
  return <Show when={rect()}>{box => <div class="selection-rectangle" style={{ left: `${box().left}px`, top: `${box().top}px`, width: `${box().width}px`, height: `${box().height}px` }}/>}</Show>;
}
