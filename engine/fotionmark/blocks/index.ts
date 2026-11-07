import { createRegistry } from '../schema/registry.ts';
import { columns, column } from './columns.ts';
import { indent } from './indent.ts';
import { linkToPage } from './link-to-page.ts';
import { video, audio, pdf, file, embed, bookmark } from './media.ts';
import { breadcrumb } from './breadcrumb.ts';
import { button } from './button.ts';
import { databaseView } from './database.ts';

/** Every FotionMark block known to this version. Adding a block starts here. */
export const blocks = createRegistry([columns, column, indent, linkToPage, video, audio, pdf, file, embed, bookmark, breadcrumb, button, databaseView]);
export { columns, column, indent, linkToPage, video, audio, pdf, file, embed, bookmark, breadcrumb, button, databaseView };
