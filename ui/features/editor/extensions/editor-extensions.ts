import { documentExtensions, tableExtension, type Page } from '../../../../engine';
import { TableOfContents } from './table-of-contents';
import { PageMention } from './page-mention';
import { CodeBlock } from './code-block';
import { Toggle, ToggleSummary } from './blocks';
import { Callout } from './callout';
import { LinkToPage } from './link-to-page';
import { mediaViews } from './media';
import { ImageView } from './image-view';
import { Breadcrumb, type Trail } from './breadcrumb';
import { ButtonBlock } from './button';
import { BlockMath, InlineMath } from './math';
import { DatabaseView, type DatabaseHost } from './database-view';

export function editorExtensions(getPage: (id: string) => Pick<Page, 'title' | 'icon' | 'trashed'> | undefined = () => undefined, getTrail: () => Trail = () => [], database?: DatabaseHost) {
  const views = [TableOfContents, CodeBlock, Toggle, ToggleSummary, Callout, PageMention.configure({ getPage }), LinkToPage.configure({ getPage }), ...mediaViews, ImageView, Breadcrumb.configure({ getTrail }), ButtonBlock, BlockMath, InlineMath, database ? DatabaseView.configure({ host: database }) : DatabaseView, tableExtension().configure({ resizable: true })];
  return documentExtensions(getPage).map(extension => views.find(view => view.name === extension.name) || extension);
}
