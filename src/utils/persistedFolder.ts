import type { FolderItem, FolderItemWithStatus } from "../types/folder";

function getBasename(folderPath: string) {
  const parts = folderPath.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) ?? folderPath;
}

export function dedupeTags(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim())))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function isValidId(id: unknown): id is string {
  return typeof id === "string" && id.trim().length > 0;
}

export function toPersistedFolder(
  input: Partial<FolderItem> & Pick<FolderItem, "path">,
  fallback?: Partial<FolderItem>
): FolderItem {
  const normalizedPath = input.path.trim();
  const name =
    input.name?.trim() ||
    fallback?.name?.trim() ||
    getBasename(normalizedPath);

  return {
    id: isValidId(input.id) ? input.id.trim() : crypto.randomUUID(),
    name,
    path: normalizedPath,
    tags: dedupeTags(input.tags ?? fallback?.tags ?? []),
    favorite: Boolean(input.favorite ?? fallback?.favorite ?? false),
    openCount: Math.max(
      0,
      Number(input.openCount ?? fallback?.openCount ?? 0) || 0
    ),
    lastOpenedAt: input.lastOpenedAt ?? fallback?.lastOpenedAt,
    createdAt:
      input.createdAt?.trim() ||
      fallback?.createdAt ||
      new Date().toISOString()
  };
}

export function stripRuntimeFields(folder: FolderItemWithStatus): FolderItem {
  const { missing: _missing, ...rest } = folder;
  return toPersistedFolder(rest, rest);
}

export function resolveImportId(
  candidate: unknown,
  reservedIds: Set<string>
) {
  if (isValidId(candidate) && !reservedIds.has(candidate.trim())) {
    const id = candidate.trim();
    reservedIds.add(id);
    return id;
  }

  const id = crypto.randomUUID();
  reservedIds.add(id);
  return id;
}
