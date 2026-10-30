import { documentExtensions, tableExtension, type Page } from '../../../../engine';
import { TableOfContents } from './table-of-contents';
import { PageMention } from './page-mention';
import { CodeBlock } from './code-block';
import { Toggle, ToggleSummary } from './blocks';
import { Callout } from './callout';

export function editorExtensions(getPage: (id: string) => Pick<Page, 'title' | 'icon' | 'trashed'> | undefined = () => undefined) {
  const views = [TableOfContents, CodeBlock, Toggle, ToggleSummary, Callout, PageMention.configure({ getPage }), tableExtension().configure({ resizable: true })];
  return documentExtensions(getPage).map(extension => views.find(view => view.name === extension.name) || extension);
}
