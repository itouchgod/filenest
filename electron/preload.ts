import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { FolderItem, FolderSetupOptions } from "../src/types/folder";

contextBridge.exposeInMainWorld("fileNest", {
  getFolders: () => ipcRenderer.invoke("folders:get"),
  addFolder: (path: string) => ipcRenderer.invoke("folders:add", path),
  addFolderWithOptions: (path: string, options?: FolderSetupOptions) =>
    ipcRenderer.invoke("folders:addWithOptions", path, options),
  updateFolder: (folder: FolderItem) =>
    ipcRenderer.invoke("folders:update", folder),
  deleteFolder: (id: string) => ipcRenderer.invoke("folders:delete", id),
  openFolder: (path: string) => ipcRenderer.invoke("folders:open", path),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  exportFoldersToFile: () => ipcRenderer.invoke("folders:exportToFile"),
  importFoldersFromFile: () => ipcRenderer.invoke("folders:importFromFile"),
  importFolders: (items: FolderItem[]) =>
    ipcRenderer.invoke("folders:import", items)
});
