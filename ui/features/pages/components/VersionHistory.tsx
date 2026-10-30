import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';
import { Editor } from '@tiptap/core';
import { editorExtensions } from '../../editor';
import type { PageSnapshot, PageVersion } from '../../../../engine';

function SnapshotPreview(props: { content: string }) {
  let element!: HTMLDivElement;
  onMount(() => {
    const editor = new Editor({ element, editable: false, extensions: editorExtensions(), content: props.content, contentType: 'markdown', editorProps: {
      attributes: { class: 'prose', 'aria-label': 'Aperçu en lecture seule' },
      handleDOMEvents: { click: (_view, event) => { if ((event.target as HTMLElement).closest('a')) { event.preventDefault(); return true; } return false; } },
    } });
    onCleanup(() => editor.destroy());
  });
  return <div ref={element} class="snapshot-rendered"/>;
}

export default function VersionHistory(props: { pageId: string; restoring: boolean; onRestore: (version: string) => Promise<void> }) {
  const [versions, setVersions] = createSignal<PageVersion[]>([]);
  const [selected, setSelected] = createSignal('');
  const [snapshot, setSnapshot] = createSignal<PageSnapshot>();
  const [loading, setLoading] = createSignal(true);
  const [previewLoading, setPreviewLoading] = createSignal(false);
  const [error, setError] = createSignal('');
  const [raw, setRaw] = createSignal(false);
  let alive = true, request = 0;
  onCleanup(() => { alive = false; });
  const date = (value: string) => new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'medium' });
  async function read<T>(path: string): Promise<T> {
    const response = await fetch(`/api/pages/${encodeURIComponent(props.pageId)}/history${path}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Impossible de charger les versions.');
    return data;
  }
  async function preview(version: string) {
    const sequence = ++request;
    setSelected(version); setSnapshot(undefined); setPreviewLoading(true); setError('');
    try { const data = await read<PageSnapshot>(`/${version}`); if (alive && sequence === request) setSnapshot(data); }
    catch (e) { if (alive && sequence === request) setError((e as Error).message); }
    finally { if (alive && sequence === request) setPreviewLoading(false); }
  }
  async function load() {
    setLoading(true); setError('');
    try {
      const data = await read<PageVersion[]>('');
      if (!alive) return;
      setVersions(data);
      if (data[0]) void preview(data[0].version);
    } catch (e) { if (alive) setError((e as Error).message); }
    finally { if (alive) setLoading(false); }
  }
  onMount(() => void load());
  async function restore() {
    const value = snapshot(); if (!value || props.restoring) return;
    setError('');
    try { await props.onRestore(value.version); }
    catch (e) { if (alive) setError((e as Error).message); }
  }
  return <div class="version-history">
    <header><h2>Historique de la page</h2><p>Choisissez une sauvegarde pour la consulter avant de la restaurer.</p></header>
    <Show when={error()}><div class="version-error" role="alert">{error()} <button disabled={props.restoring} onClick={() => void load()}>Réessayer</button></div></Show>
    <Show when={!loading()} fallback={<p role="status">Chargement des versions…</p>}>
      <Show when={versions().length} fallback={<div class="version-empty">Aucune ancienne version. Les versions précédentes sont conservées après chaque enregistrement d’une modification.</div>}>
        <div class="version-layout"><nav aria-label="Versions enregistrées"><For each={versions()}>{version => <button disabled={props.restoring} classList={{ selected: selected() === version.version }} aria-current={selected() === version.version ? 'true' : undefined} onClick={() => void preview(version.version)}><strong>{date(version.savedAt)}</strong><small>{Math.max(1, Math.round(version.bytes / 1024))} Ko · {version.version.slice(0, 8)}</small></button>}</For></nav>
          <section class="version-preview" aria-label="Aperçu de la version" aria-busy={previewLoading()}>
            <Show when={!previewLoading()} fallback={<p role="status">Chargement de l’aperçu…</p>}><Show when={snapshot()}>{value => <><h3>{value().page.icon} {value().page.title || 'Sans titre'}</h3><small>Sauvegardée le {date(value().savedAt)}</small><div class="version-view-switch" role="group" aria-label="Affichage de la version"><button aria-pressed={!raw()} onClick={() => setRaw(false)}>Aperçu</button><button aria-pressed={raw()} onClick={() => setRaw(true)}>Markdown</button></div><Show when={!raw()} fallback={<pre tabIndex={0} aria-label="Contenu Markdown de la version">{value().page.content || '(Page vide)'}</pre>}><SnapshotPreview content={value().page.content}/></Show></>}</Show></Show>
          </section>
        </div>
        <footer><p>Le titre, le contenu et la présentation seront restaurés. L’emplacement et les favoris actuels seront conservés. La version actuelle sera sauvegardée avant le remplacement.</p><button class="primary-button" disabled={!snapshot() || previewLoading() || props.restoring} onClick={() => void restore()}>{props.restoring ? 'Restauration…' : 'Restaurer cette version'}</button></footer>
      </Show>
    </Show>
  </div>;
}
