import { Show, type JSX } from 'solid-js';
import { ChevronRight, Search } from 'lucide-solid';

/** Floating menu surface: Notion's 10px radius, layered shadow and 4px inner padding. */
export function Menu(props: { label: string; class?: string; style?: JSX.CSSProperties; children: JSX.Element; onKeyDown?: JSX.EventHandler<HTMLDivElement, KeyboardEvent> }) {
  return <div class={`kit-menu popover ${props.class || ''}`} role="menu" aria-label={props.label} style={props.style} onKeyDown={props.onKeyDown}>{props.children}</div>;
}

/** One 28px row: icon, label, then a muted shortcut or a submenu chevron on the right. */
export function MenuItem(props: { icon?: JSX.Element; children: JSX.Element; shortcut?: string; submenu?: boolean; danger?: boolean; disabled?: boolean; title?: string; onClick?: () => void }) {
  return <button type="button" role="menuitem" class="kit-menu-item" classList={{ danger: props.danger }} disabled={props.disabled} title={props.title} onClick={() => props.onClick?.()}>
    <Show when={props.icon}><span class="kit-menu-icon" aria-hidden="true">{props.icon}</span></Show>
    <span class="kit-menu-label">{props.children}</span>
    <Show when={props.shortcut}><kbd class="kit-menu-shortcut" aria-hidden="true">{props.shortcut}</kbd></Show>
    <Show when={props.submenu}><ChevronRight size={14} class="kit-menu-chevron"/></Show>
  </button>;
}

export const MenuDivider = () => <div class="kit-menu-divider" role="separator"/>;
export const MenuLabel = (props: { children: JSX.Element }) => <div class="kit-menu-label-row">{props.children}</div>;
export const MenuFootnote = (props: { children: JSX.Element }) => <div class="kit-menu-footnote">{props.children}</div>;

/** Search field at the top of a menu, as in Notion's block menu. */
export function MenuSearch(props: { label: string; placeholder: string; value: string; onInput: (value: string) => void; autofocus?: boolean }) {
  return <label class="kit-menu-search"><Search size={14}/><input aria-label={props.label} placeholder={props.placeholder} value={props.value} ref={element => { if (props.autofocus) requestAnimationFrame(() => element.focus()); }} onInput={e => props.onInput(e.currentTarget.value)}/></label>;
}
