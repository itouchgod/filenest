import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { FolderItem } from "../src/types/folder";

contextBridge.exposeInMainWorld("fileNest", {
  getFolders: () => ipcRenderer.invoke("folders:get"),
  addFolder: (path: string) => ipcRenderer.invoke("folders:add", path),
  updateFolder: (folder: FolderItem) =>
    ipcRenderer.invoke("folders:update", folder),
  deleteFolder: (id: string) => ipcRenderer.invoke("folders:delete", id),
  openFolder: (path: string) => ipcRenderer.invoke("folders:open", path),
  getPathForFile: (file: File) => webUtils.getPathForFile(file)
});
