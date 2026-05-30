export type FolderItem = {
  id: string;
  name: string;
  path: string;
  tags: string[];
  favorite: boolean;
  openCount: number;
  lastOpenedAt?: string;
  createdAt: string;
};

export type FolderItemWithStatus = FolderItem & {
  missing?: boolean;
};

export type FolderSetupOptions = {
  tags?: string[];
  favorite?: boolean;
  name?: string;
};

export type DisplayLayout = "grid" | "list" | "compact";

export type FolderView = "all" | "favorites" | "recent";

export type FolderFilter = {
  view: FolderView;
  tag?: string;
};

export type ImportResult = {
  added: number;
  skipped: number;
  invalid: number;
};
