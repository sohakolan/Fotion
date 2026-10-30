import { Toggle as EngineToggle, ToggleSummary as EngineToggleSummary } from '../../../../engine';

export const ToggleSummary = EngineToggleSummary.extend({
  addKeyboardShortcuts() {
    return { Enter: () => {
      const { $from } = this.editor.state.selection;
      if ($from.parent.type.name !== this.name) return false;
      const summary = this.editor.view.nodeDOM($from.before());
      if (summary instanceof HTMLElement) summary.closest('details')?.setAttribute('open', '');
      return this.editor.commands.setTextSelection($from.after() + 1);
    } };
  },
});

export const Toggle = EngineToggle.extend({
  addNodeView() {
    return () => {
      const dom = document.createElement('details'); dom.open = true; dom.className = 'toggle-block';
      const click = (event: MouseEvent) => {
        const summary = (event.target as HTMLElement).closest('summary');
        if (!summary || summary.parentElement !== dom) return;
        event.preventDefault();
        if (event.detail === 0 || event.clientX <= summary.getBoundingClientRect().left + 21) dom.open = !dom.open;
      };
      dom.addEventListener('click', click);
      return { dom, contentDOM: dom, ignoreMutation: mutation => mutation.type === 'attributes' && mutation.target === dom && mutation.attributeName === 'open', destroy: () => dom.removeEventListener('click', click) };
    };
  },
});
