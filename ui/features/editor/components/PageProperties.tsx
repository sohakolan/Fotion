import { createEffect, onCleanup } from 'solid-js';
import type { Page, PageEdit } from '../../../../engine';
import { renderProperties, closePopover, freeze } from '../lib/database-cells';

/** Notion's properties block under the title of a database row; nothing for an ordinary page. */
export default function PageProperties(props: { page: Page; pages: Page[]; onUpdate: (id: string, patch: Partial<PageEdit>) => void; onCreateRow: (database: string, values?: Record<string, unknown>) => Promise<Page | undefined>; onOpen: (id: string) => void; readOnly?: boolean }) {
  let container!: HTMLDivElement;
  const host = { pageId: () => props.page.id, pages: () => props.pages, update: props.onUpdate, createRow: props.onCreateRow, open: props.onOpen };
  // Re-render on every page change; renderProperties leaves a field being typed in untouched.
  const draw = () => { container.classList.remove('database-readonly'); renderProperties(container, host, props.page); if (props.readOnly) freeze(container); };
  createEffect(() => { props.pages; props.readOnly; draw(); });
  const refocusOut = (event: FocusEvent) => { if (!container.contains(event.relatedTarget as Node)) requestAnimationFrame(draw); };
  onCleanup(closePopover);
  return <div class="page-properties" ref={container} onFocusOut={refocusOut}/>;
}
