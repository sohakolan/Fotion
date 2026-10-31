import { blocks } from '../fotionmark';
import { fotionmarkNode } from './fotionmark-node';

/** Editor node for FotionMark `button`; its content is the template the button inserts. */
export const ButtonBlock = fotionmarkNode(blocks.get('button')!, { content: 'block+' });
