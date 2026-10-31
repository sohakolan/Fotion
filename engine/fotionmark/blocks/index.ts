import { createRegistry } from '../schema/registry';
import { columns, column } from './columns';
import { indent } from './indent';
import { linkToPage } from './link-to-page';
import { video, audio, pdf, file, embed, bookmark } from './media';
import { breadcrumb } from './breadcrumb';
import { button } from './button';

/** Every FotionMark block known to this version. Adding a block starts here. */
export const blocks = createRegistry([columns, column, indent, linkToPage, video, audio, pdf, file, embed, bookmark, breadcrumb, button]);
export { columns, column, indent, linkToPage, video, audio, pdf, file, embed, bookmark, breadcrumb, button };
