import { blocks } from '../fotionmark';
import { fotionmarkNode } from './fotionmark-node';

/** Editor node for FotionMark `database-view`; the UI view renders the rows of the database. */
export const DatabaseView = fotionmarkNode(blocks.get('database-view')!);
