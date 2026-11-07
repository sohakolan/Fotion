import { defineBlock } from '../schema/define-block.ts';

/** Notion's media blocks. `src` is a web address or a file imported into the vault (`attachments/…`). */
export const video = defineBlock({ name: 'video', form: 'leaf', version: 1, description: 'Vidéo importée ou intégrée (YouTube, Vimeo…).', attributes: { src: { type: 'source' } } });
export const audio = defineBlock({ name: 'audio', form: 'leaf', version: 1, description: 'Fichier audio importé ou lien.', attributes: { src: { type: 'source' } } });
export const pdf = defineBlock({ name: 'pdf', form: 'leaf', version: 1, description: 'Document PDF affiché dans la page.', attributes: { src: { type: 'source' } } });
export const file = defineBlock({ name: 'file', form: 'leaf', version: 1, description: 'Fichier à télécharger.', attributes: { src: { type: 'source' }, name: { type: 'string', maxLength: 200 }, size: { type: 'number', integer: true, min: 0 } } });
export const embed = defineBlock({ name: 'embed', form: 'leaf', version: 1, description: 'Page web intégrée dans un cadre isolé.', attributes: { url: { type: 'url' }, height: { type: 'number', integer: true, min: 80, max: 2000, default: 400 } } });
export const bookmark = defineBlock({ name: 'bookmark', form: 'leaf', version: 1, description: 'Signet web avec titre, description et aperçu.', attributes: { url: { type: 'url' }, title: { type: 'string', maxLength: 300 }, description: { type: 'string', maxLength: 300 }, image: { type: 'url' } } });
