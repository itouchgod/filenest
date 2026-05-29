import type { FolderFilter, FolderItem } from "../types/folder";

const webStorageKey = "filenest.webPreview.folders";

function isNativeApp() {
  return Boolean(window.fileNest);
}

function readWebFolders(): FolderItem[] {
  try {
    const raw = window.localStorage.getItem(webStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeWebFolders(folders: FolderItem[]) {
  window.localStorage.setItem(webStorageKey, JSON.stringify(folders));
}

function getFolderName(folderPath: string) {
  const parts = folderPath.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) ?? folderPath;
}

function dedupeTags(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim())))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export async function getFolders() {
  if (isNativeApp()) return window.fileNest!.getFolders();
  return readWebFolders();
}

export async function addFolder(path: string) {
  if (isNativeApp()) return window.fileNest!.addFolder(path);

  const folders = readWebFolders();
  if (folders.some((folder) => folder.path === path)) {
    throw new Error("This folder already exists in FileNest.");
  }

  const now = new Date().toISOString();
  const folder: FolderItem = {
    id: crypto.randomUUID(),
    name: getFolderName(path),
    path,
    tags: [],
    favorite: false,
    openCount: 0,
    createdAt: now
  };

  writeWebFolders([folder, ...folders]);
  return folder;
}

export async function updateFolder(folder: FolderItem) {
  if (isNativeApp()) return window.fileNest!.updateFolder(folder);

  const nextFolder = { ...folder, tags: dedupeTags(folder.tags) };
  const folders = readWebFolders().map((item) =>
    item.id === nextFolder.id ? nextFolder : item
  );
  writeWebFolders(folders);
  return nextFolder;
}

export async function deleteFolder(id: string) {
  if (isNativeApp()) return window.fileNest!.deleteFolder(id);

  writeWebFolders(readWebFolders().filter((folder) => folder.id !== id));
  return id;
}

export async function openFolder(path: string) {
  if (isNativeApp()) return window.fileNest!.openFolder(path);

  const folders = readWebFolders();
  const folder = folders.find((item) => item.path === path);
  if (!folder) return null;

  const openedFolder: FolderItem = {
    ...folder,
    openCount: folder.openCount + 1,
    lastOpenedAt: new Date().toISOString()
  };

  writeWebFolders(
    folders.map((item) => (item.id === openedFolder.id ? openedFolder : item))
  );

  return openedFolder;
}

export function getDroppedPath(file: File) {
  if (isNativeApp()) return window.fileNest!.getPathForFile(file);
  return file.webkitRelativePath || file.name;
}

export function getAllTags(folders: FolderItem[]) {
  return Array.from(new Set(folders.flatMap((folder) => folder.tags)))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export function filterFolders(
  folders: FolderItem[],
  filter: FolderFilter,
  searchTerm: string
) {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const visible = folders.filter((folder) => {
    if (filter.view === "favorites" && !folder.favorite) return false;
    if (filter.tag && !folder.tags.includes(filter.tag)) return false;

    if (!normalizedSearch) return true;

    const searchable = [folder.name, folder.path, ...folder.tags]
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedSearch);
  });

  if (filter.view === "recent") {
    return [...visible].sort((a, b) => {
      const aTime = a.lastOpenedAt ? new Date(a.lastOpenedAt).getTime() : 0;
      const bTime = b.lastOpenedAt ? new Date(b.lastOpenedAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  return visible.sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
