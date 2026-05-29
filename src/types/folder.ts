export type FolderItem = {
  id: string;
  name: string;
  path: string;
  tags: string[];
  favorite: boolean;
  note?: string;
  openCount: number;
  lastOpenedAt?: string;
  createdAt: string;
};

export type FolderView = "all" | "favorites" | "recent";

export type FolderFilter = {
  view: FolderView;
  tag?: string;
};
