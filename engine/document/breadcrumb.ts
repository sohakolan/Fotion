import { blocks } from '../fotionmark';
import { fotionmarkNode } from './fotionmark-node';

/** Editor node for FotionMark `breadcrumb`; the UI view draws the current path. */
export const Breadcrumb = fotionmarkNode(blocks.get('breadcrumb')!);
