export const normalizeSearch = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
export function pageIdFromHref(href: string): string | null {
  try {
    const id = decodeURIComponent(href.split(/[?#]/, 1)[0].replace(/^\.\//, ''));
    return id.endsWith('.md') && !id.startsWith('.') && !/[/\\:\x00-\x1f]/.test(id) && id.length <= 220 ? id : null;
  } catch { return null; }
}
export const pageHref = (id: string) => `./${encodeURIComponent(id)}`;

