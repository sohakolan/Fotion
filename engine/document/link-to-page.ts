import { blocks } from '../fotionmark';
import { fotionmarkNode } from './fotionmark-node';

/** Editor node for FotionMark `link-to-page`; the UI view shows the page's current title and icon. */
export const LinkToPage = fotionmarkNode(blocks.get('link-to-page')!);
