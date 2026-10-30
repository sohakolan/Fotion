import { blocks } from '../fotionmark';
import { fotionmarkNode } from './fotionmark-node';

/** Editor nodes for the FotionMark `columns` family (declared in fotionmark/blocks/columns.ts). */
export const Columns = fotionmarkNode(blocks.get('columns')!, { content: 'column{2,5}' });
export const Column = fotionmarkNode(blocks.get('column')!, { content: 'block+', html: ({ width }): Record<string, string> => width ? { style: `flex: 0 0 ${width}%` } : {} });
