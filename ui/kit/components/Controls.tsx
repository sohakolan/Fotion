import { type JSX } from 'solid-js';

export function Button(props: { variant?: 'primary' | 'secondary'; type?: 'button' | 'submit'; disabled?: boolean; onClick?: () => void; children: JSX.Element }) {
  return <button type={props.type || 'button'} class={`kit-button kit-button-${props.variant || 'secondary'}`} disabled={props.disabled} onClick={() => props.onClick?.()}>{props.children}</button>;
}

export function IconButton(props: { label: string; disabled?: boolean; onClick?: (event: MouseEvent) => void; children: JSX.Element }) {
  return <button type="button" class="kit-icon-button icon-button" aria-label={props.label} disabled={props.disabled} onClick={e => props.onClick?.(e)}>{props.children}</button>;
}

/** Menu row with Notion's small blue switch; the whole row toggles. */
export function Switch(props: { checked: boolean; onChange: (checked: boolean) => void; children: JSX.Element }) {
  return <button type="button" role="menuitemcheckbox" aria-checked={props.checked} class="kit-menu-item kit-switch-row" onClick={() => props.onChange(!props.checked)}>
    <span class="kit-menu-label">{props.children}</span><span class="kit-switch" classList={{ on: props.checked }} aria-hidden="true"/>
  </button>;
}

export const Kbd = (props: { children: JSX.Element }) => <kbd class="kit-kbd">{props.children}</kbd>;

/** Dark tooltip shown on hover/focus of its parent, e.g. “Faire glisser pour déplacer”. */
export const Tooltip = (props: { children: JSX.Element }) => <span class="kit-tooltip" aria-hidden="true">{props.children}</span>;

/** Platform-specific modifier labels, like Notion's ⌘ on macOS and Ctrl elsewhere. */
export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export const modKey = isMac ? '⌘' : 'Ctrl';
export const altKey = isMac ? '⌥' : 'Alt';
