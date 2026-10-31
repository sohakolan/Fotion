import { ButtonBlock as EngineButton } from '../../../../engine';

/**
 * Notion button: clicking it inserts a copy of its template right below. The gear opens the settings:
 * the label and the template, edited in place like any other blocks.
 */
export const ButtonBlock = EngineButton.extend({
  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current = node;
      const dom = document.createElement('div'); dom.className = 'fm-button';
      const row = document.createElement('div'); row.className = 'button-row'; row.contentEditable = 'false';
      const run = document.createElement('button'); run.type = 'button'; run.className = 'fotion-button';
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'button-edit'; edit.setAttribute('aria-label', 'Modifier le bouton'); edit.textContent = '⚙';
      const settings = document.createElement('div'); settings.className = 'button-settings'; settings.contentEditable = 'false'; settings.hidden = true;
      const label = document.createElement('input'); label.setAttribute('aria-label', 'Libellé du bouton');
      settings.append(Object.assign(document.createElement('span'), { textContent: 'Insérer en dessous :' }), label);
      const template = document.createElement('div'); template.className = 'button-template'; template.hidden = true;
      row.append(run, edit); dom.append(row, settings, template);
      const text = () => current.attrs.label || 'Nouveau bouton';
      const refresh = () => { run.textContent = text(); if (document.activeElement !== label) label.value = current.attrs.label ?? ''; };
      run.addEventListener('click', () => {
        const pos = getPos(); if (typeof pos !== 'number') return;
        editor.chain().insertContentAt(pos + current.nodeSize, current.content.toJSON()).run();
      });
      edit.addEventListener('click', () => { settings.hidden = template.hidden = !settings.hidden; if (!settings.hidden) label.focus(); });
      label.addEventListener('input', () => {
        const pos = getPos(); if (typeof pos !== 'number') return;
        // A label cannot contain ] or line breaks: they would end the directive label in the file.
        const value = label.value.replace(/[\]\n\r]/g, '');
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, label: value || null }));
      });
      refresh();
      return {
        dom, contentDOM: template,
        update(updated) { if (updated.type !== current.type) return false; current = updated; refresh(); return true; },
        stopEvent: event => !!(event.target as HTMLElement).closest('.button-row, .button-settings'),
        ignoreMutation: mutation => !template.contains(mutation.target),
      };
    };
  },
});
