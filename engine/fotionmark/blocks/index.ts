import { createRegistry } from '../schema/registry';
import { columns, column } from './columns';

/** Every FotionMark block known to this version. Adding a block starts here. */
export const blocks = createRegistry([columns, column]);
export { columns, column };
