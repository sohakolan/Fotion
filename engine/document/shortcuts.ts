import { Extension, InputRule, wrappingInputRule } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

// Notion uses `>` for toggles and `"` for quotes; the higher priority wins over the default `>` quote rule.
export const NotionShortcuts = Extension.create({
  name: 'notionShortcuts',
  priority: 1000,
  addInputRules() {
    const { toggle, toggleSummary, paragraph, blockquote } = this.editor.schema.nodes;
    return [
      new InputRule({ find: /^>\s$/, handler: ({ state, range }) => {
        const $from = state.doc.resolve(range.from);
        const container = $from.node(-1), index = $from.index(-1);
        if ($from.parent.type !== paragraph || !container.canReplaceWith(index, index + 1, toggle)) return null;
        const summary = $from.parent.content.cut(range.to - $from.start());
        const start = $from.before();
        state.tr.replaceWith(start, $from.after(), toggle.create(null, [toggleSummary.create(null, summary), paragraph.create()]));
        state.tr.setSelection(TextSelection.create(state.tr.doc, start + 2 + summary.size));
      } }),
      wrappingInputRule({ find: /^\s*"\s$/, type: blockquote }),
    ];
  },
});
