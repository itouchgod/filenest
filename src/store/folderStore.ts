import type { FolderFilter, FolderItem } from "../types/folder";

export async function getFolders() {
  return window.fileNest.getFolders();
}

export async function addFolder(path: string) {
  return window.fileNest.addFolder(path);
}

export async function updateFolder(folder: FolderItem) {
  return window.fileNest.updateFolder(folder);
}

export async function deleteFolder(id: string) {
  return window.fileNest.deleteFolder(id);
}

export async function openFolder(path: string) {
  return window.fileNest.openFolder(path);
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
