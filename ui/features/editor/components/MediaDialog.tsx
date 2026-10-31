import { createSignal, Show } from 'solid-js';
import { X, Upload, Link } from 'lucide-solid';

export type MediaKind = 'image' | 'video' | 'audio' | 'pdf' | 'file' | 'bookmark' | 'embed';
export type MediaResult = Record<string, string>;

const titles: Record<MediaKind, string> = { image: 'Ajouter une image', video: 'Ajouter une vidéo', audio: 'Ajouter un audio', pdf: 'Ajouter un PDF', file: 'Ajouter un fichier', bookmark: 'Créer un signet web', embed: 'Intégrer une page web' };
const accept: Partial<Record<MediaKind, string>> = { image: 'image/*', video: 'video/*', audio: 'audio/*', pdf: 'application/pdf', file: '' };
const placeholders: Record<MediaKind, string> = { image: 'Collez le lien de l’image…', video: 'Collez un lien YouTube, Vimeo ou vidéo…', audio: 'Collez le lien du fichier audio…', pdf: 'Collez le lien du PDF…', file: 'Collez le lien du fichier…', bookmark: 'Collez un lien, par exemple https://notion.com', embed: 'Collez le lien à intégrer…' };

/** Copies a file into the vault's attachments/ folder and returns its relative path. */
export async function upload(file: File): Promise<{ path: string; name: string; size: number }> {
  const response = await fetch('/api/attachments', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) }, body: file });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Import impossible.');
  return data;
}

/** Notion's media popover: « Importer » copies the file into the vault, « Intégrer un lien » keeps the address. */
/** Media block for a dropped or pasted file, from its type, like Notion. */
export function mediaKindOf(file: File): MediaKind {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return file.type === 'application/pdf' ? 'pdf' : 'file';
}

export default function MediaDialog(props: { kind: MediaKind; onSubmit: (result: MediaResult) => void; onClose: () => void }) {
  const canUpload = () => props.kind in accept;
  const [tab, setTab] = createSignal<'upload' | 'link'>(canUpload() ? 'upload' : 'link');
  const [url, setUrl] = createSignal('');
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal('');
  const fail = (e: unknown) => { setError((e as Error).message); setBusy(false); };
  async function importFile(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError('');
    try { const stored = await upload(file); props.onSubmit(props.kind === 'file' ? { src: stored.path, name: stored.name, size: String(stored.size) } : { src: stored.path }); }
    catch (e) { fail(e); }
  }
  async function submitLink(event: SubmitEvent) {
    event.preventDefault();
    const value = url().trim();
    if (!/^https?:\/\/\S+$/i.test(value)) { setError('Saisissez une adresse http:// ou https://.'); return; }
    if (props.kind !== 'bookmark') { props.onSubmit(props.kind === 'embed' ? { url: value } : { src: value }); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(value)}`);
      const preview = await response.json();
      if (!response.ok) throw new Error(preview.error || 'Aperçu indisponible.');
      props.onSubmit({ url: preview.url, title: preview.title, description: preview.description, ...(preview.image ? { image: preview.image } : {}) });
    } catch (e) { fail(e); }
  }
  return <div class="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) props.onClose(); }}>
    <section class="modal media-dialog" role="dialog" aria-modal="true" aria-label={titles[props.kind]} onKeyDown={e => { if (e.key === 'Escape') props.onClose(); }}>
      <div class="media-tabs" role="tablist">
        <Show when={canUpload()}><button type="button" role="tab" aria-selected={tab() === 'upload'} onClick={() => setTab('upload')}>Importer</button></Show>
        <button type="button" role="tab" aria-selected={tab() === 'link'} onClick={() => setTab('link')}>{props.kind === 'bookmark' ? 'Signet' : 'Intégrer un lien'}</button>
        <button type="button" class="icon-button media-close" aria-label="Fermer" onClick={() => props.onClose()}><X size={16}/></button>
      </div>
      <Show when={tab() === 'upload'} fallback={<form class="media-body" onSubmit={submitLink}>
        <input class="media-url" aria-label="Lien" placeholder={placeholders[props.kind]} value={url()} ref={element => requestAnimationFrame(() => element.focus())} onInput={e => setUrl(e.currentTarget.value)}/>
        <button class="kit-button kit-button-primary" type="submit" disabled={busy()}><Link size={14}/>{busy() ? 'Chargement…' : props.kind === 'bookmark' ? 'Créer le signet' : 'Intégrer le lien'}</button>
      </form>}>
        <label class="media-body media-drop">
          <input type="file" aria-label="Choisir un fichier" accept={accept[props.kind]} hidden onChange={e => void importFile(e.currentTarget.files?.[0])}/>
          <span class="kit-button kit-button-secondary"><Upload size={14}/>{busy() ? 'Import…' : 'Choisir un fichier'}</span>
          <small>Le fichier est copié dans le dossier attachments/ de votre coffre (50 Mo maximum).</small>
        </label>
      </Show>
      <Show when={error()}><p class="field-error media-error">{error()}</p></Show>
    </section>
  </div>;
}
