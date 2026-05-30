import type {
  FolderItem,
  FolderItemWithStatus,
  FolderSetupOptions,
  ImportResult
} from "./folder";

export type FileNestApi = {
  getFolders: () => Promise<FolderItemWithStatus[]>;
  addFolder: (path: string) => Promise<FolderItem>;
  addFolderWithOptions: (
    path: string,
    options?: FolderSetupOptions
  ) => Promise<FolderItem>;
  updateFolder: (folder: FolderItem) => Promise<FolderItem>;
  deleteFolder: (id: string) => Promise<string>;
  openFolder: (path: string) => Promise<FolderItem | null>;
  getPathForFile: (file: File) => string;
  exportFoldersToFile: () => Promise<string | null>;
  importFoldersFromFile: () => Promise<ImportResult | null>;
  importFolders: (items: FolderItem[]) => Promise<ImportResult>;
};

declare global {
  interface Window {
    fileNest?: FileNestApi;
  }
}

export {};
