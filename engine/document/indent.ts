import { blocks } from '../fotionmark';
import { fotionmarkNode } from './fotionmark-node';

/** Editor node for FotionMark `indent` (declared in fotionmark/blocks/indent.ts). */
export const Indent = fotionmarkNode(blocks.get('indent')!, { content: 'block+' });
