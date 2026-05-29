import type { FolderItem } from "./folder";

export type FileNestApi = {
  getFolders: () => Promise<FolderItem[]>;
  addFolder: (path: string) => Promise<FolderItem>;
  updateFolder: (folder: FolderItem) => Promise<FolderItem>;
  deleteFolder: (id: string) => Promise<string>;
  openFolder: (path: string) => Promise<FolderItem | null>;
  getPathForFile: (file: File) => string;
};

declare global {
  interface Window {
    fileNest: FileNestApi;
  }
}

export {};
