import { createRegistry } from '../schema/registry';
import { columns, column } from './columns';
import { indent } from './indent';
import { linkToPage } from './link-to-page';

/** Every FotionMark block known to this version. Adding a block starts here. */
export const blocks = createRegistry([columns, column, indent, linkToPage]);
export { columns, column, indent, linkToPage };
