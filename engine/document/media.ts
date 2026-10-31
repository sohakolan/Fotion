import { blocks } from '../fotionmark';
import { fotionmarkNode } from './fotionmark-node';

/** Editor nodes of the FotionMark media family (fotionmark/blocks/media.ts); the UI draws players and cards. */
export const mediaNodes = ['video', 'audio', 'pdf', 'file', 'embed', 'bookmark'].map(name => fotionmarkNode(blocks.get(name)!));
