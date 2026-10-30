import { createEffect, onMount, onCleanup } from 'solid-js';

export default function PageTitle(props: {
  value: string;
  font: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  readOnly?: boolean;
  inputRef: (element: HTMLTextAreaElement) => void;
}) {
  let input!: HTMLTextAreaElement;
  let frame = 0;
  const resize = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      input.style.height = 'auto';
      input.style.height = `${input.scrollHeight}px`;
    });
  };
  createEffect(() => { props.value; props.font; resize(); });
  onMount(() => {
    let width = -1;
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(entries => {
      const next = entries[0]?.contentRect.width;
      // Height writes must not schedule another measurement indefinitely.
      if (next !== undefined && next !== width) { width = next; resize(); }
    });
    observer?.observe(input);
    window.addEventListener('resize', resize);
    document.fonts?.addEventListener('loadingdone', resize);
    onCleanup(() => {
      observer?.disconnect(); cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.fonts?.removeEventListener('loadingdone', resize);
    });
  });
  return <textarea ref={element => { input = element; props.inputRef(element); }} class="page-title" aria-label="Titre de la page" rows={1} placeholder="Sans titre" value={props.value} readOnly={props.readOnly}
    onInput={event => { const value = event.currentTarget.value.replace(/\n/g, ''); event.currentTarget.value = value; props.onChange(value); resize(); }}
    onKeyDown={event => { if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); props.onEnter(); } }}/>;
}
