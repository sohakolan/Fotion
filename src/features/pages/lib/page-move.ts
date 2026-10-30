import type { Page } from '../../../../shared/page';
export type PagePlacement = 'before' | 'after' | 'inside' | 'root';
export const byOrder = (a: Page, b: Page) => (a.order ?? 0) - (b.order ?? 0);

export function planPageMove(pages: Page[], id: string, targetId: string | null, placement: PagePlacement) {
  const page = pages.find(p => p.id === id && !p.trashed);
  const target = pages.find(p => p.id === targetId && !p.trashed);
  if (!page || id === targetId || (placement !== 'root' && !target)) return [];
  const parent = placement === 'root' ? null : placement === 'inside' ? target!.id : target!.parent;
  let ancestor = parent;
  const visited = new Set([id]);
  while (ancestor) {
    if (visited.has(ancestor)) return [];
    visited.add(ancestor);
    ancestor = pages.find(p => p.id === ancestor)?.parent ?? null;
  }
  const peers = pages.filter(p => !p.trashed && p.id !== id && p.parent === parent).sort(byOrder);
  const index = target ? peers.findIndex(p => p.id === target.id) : -1;
  const at = placement === 'before' ? index : placement === 'after' ? index + 1 : peers.length;
  if (at < 0) return [];
  peers.splice(at, 0, page);
  return peers.map((p, i) => ({ id: p.id, parent, order: (i + 1) * 1024 }));
}
