import type {
  FolderFilter,
  FolderItem,
  FolderItemWithStatus,
  FolderSetupOptions,
  ImportResult
} from "../types/folder";
import {
  dedupeTags,
  resolveImportId,
  stripRuntimeFields,
  toPersistedFolder
} from "../utils/persistedFolder";

const webStorageKey = "filenest.webPreview.folders";

function isNativeApp() {
  return Boolean(window.fileNest);
}

function readWebFolders(): FolderItem[] {
  try {
    const raw = window.localStorage.getItem(webStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item): item is Partial<FolderItem> & { path: string } =>
          Boolean(item && typeof item === "object" && typeof item.path === "string")
      )
      .map((item) => toPersistedFolder(item));
  } catch {
    return [];
  }
}

function writeWebFolders(folders: FolderItem[]) {
  const persisted = folders.map((folder) => toPersistedFolder(folder));
  window.localStorage.setItem(webStorageKey, JSON.stringify(persisted));
}

function getFolderName(folderPath: string) {
  const parts = folderPath.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) ?? folderPath;
}

function normalizeOptions(options?: FolderSetupOptions) {
  return {
    tags: dedupeTags(options?.tags ?? []),
    favorite: options?.favorite ?? false,
    name: options?.name?.trim() || undefined
  };
}

function withWebMissingStatus(folders: FolderItem[]): FolderItemWithStatus[] {
  return folders.map((folder) => ({ ...folder, missing: false }));
}

export async function getFolders(): Promise<FolderItemWithStatus[]> {
  if (isNativeApp()) return window.fileNest!.getFolders();
  return withWebMissingStatus(readWebFolders());
}

export async function addFolder(path: string) {
  return addFolderWithOptions(path);
}

export async function addFolderWithOptions(
  path: string,
  options?: FolderSetupOptions
) {
  const normalized = normalizeOptions(options);

  if (isNativeApp()) {
    return window.fileNest!.addFolderWithOptions(path, normalized);
  }

  const folders = readWebFolders();
  if (folders.some((folder) => folder.path === path)) {
    throw new Error("This folder already exists in FileNest.");
  }

  const now = new Date().toISOString();
  const folder = toPersistedFolder({
    id: crypto.randomUUID(),
    name: normalized.name ?? getFolderName(path),
    path,
    tags: normalized.tags,
    favorite: normalized.favorite,
    openCount: 0,
    createdAt: now
  });

  writeWebFolders([folder, ...folders]);
  return folder;
}

export async function updateFolder(folder: FolderItem | FolderItemWithStatus) {
  const persisted = stripRuntimeFields(
    "missing" in folder ? folder : { ...folder, missing: false }
  );

  if (isNativeApp()) return window.fileNest!.updateFolder(persisted);

  const folders = readWebFolders();
  const existing = folders.find((item) => item.id === persisted.id);
  const nextFolder = existing
    ? toPersistedFolder(persisted, existing)
    : toPersistedFolder(persisted);

  writeWebFolders(
    folders.map((item) => (item.id === nextFolder.id ? nextFolder : item))
  );
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

  const openedFolder = toPersistedFolder(
    {
      ...folder,
      openCount: folder.openCount + 1,
      lastOpenedAt: new Date().toISOString()
    },
    folder
  );

  writeWebFolders(
    folders.map((item) => (item.id === openedFolder.id ? openedFolder : item))
  );

  return openedFolder;
}

export async function exportFoldersToFile(): Promise<string | null> {
  if (isNativeApp()) return window.fileNest!.exportFoldersToFile();

  const folders = readWebFolders();
  const blob = new Blob([JSON.stringify(folders, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `filenest-export-${date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  return anchor.download;
}

export async function importFoldersFromFile(): Promise<ImportResult | null> {
  if (isNativeApp()) return window.fileNest!.importFoldersFromFile();

  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      try {
        const parsed = JSON.parse(await file.text());
        if (!Array.isArray(parsed)) {
          throw new Error("Invalid import file.");
        }
        resolve(await importFolders(parsed as FolderItem[]));
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}

export async function importFolders(items: FolderItem[]): Promise<ImportResult> {
  if (isNativeApp()) return window.fileNest!.importFolders(items);

  const folders = readWebFolders();
  const existingPaths = new Set(folders.map((folder) => folder.path));
  const reservedIds = new Set(folders.map((folder) => folder.id));
  let added = 0;
  let skipped = 0;
  let invalid = 0;
  const next = [...folders];

  for (const item of items) {
    if (!item?.path) {
      invalid += 1;
      continue;
    }

    if (existingPaths.has(item.path)) {
      skipped += 1;
      continue;
    }

    existingPaths.add(item.path);
    next.unshift(
      toPersistedFolder(
        {
          ...item,
          id: resolveImportId(item.id, reservedIds),
          path: item.path,
          name: item.name?.trim() || getFolderName(item.path)
        },
        {
          createdAt: item.createdAt || new Date().toISOString()
        }
      )
    );
    added += 1;
  }

  writeWebFolders(next);
  return { added, skipped, invalid };
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
  folders: FolderItemWithStatus[],
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

export function countMissingFolders(folders: FolderItemWithStatus[]) {
  return folders.filter((folder) => folder.missing).length;
}
