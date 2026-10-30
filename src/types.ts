export interface Page {
  id: string;
  title: string;
  order?: number;
  fullWidth?: boolean;
  smallText?: boolean;
  font?: 'default' | 'serif' | 'mono';
  icon: string;
  parent: string | null;
  favorite: boolean;
  cover: string;
  content: string;
  version: string;
  updated: string;
  trashed: boolean;
}
export type PageEdit = Pick<Page, 'title' | 'icon' | 'parent' | 'favorite' | 'cover' | 'content' | 'trashed' | 'order' | 'fullWidth' | 'smallText' | 'font'>;

export interface PageVersion { version: string; savedAt: string; bytes: number }
export interface PageSnapshot extends PageVersion { page: Page }
