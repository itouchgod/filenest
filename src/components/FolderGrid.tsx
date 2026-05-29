import type { FolderItem } from "../types/folder";
import FolderCard from "./FolderCard";

type FolderGridProps = {
  folders: FolderItem[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onOpen: (folder: FolderItem) => void;
  onUpdate: (folder: FolderItem) => void;
};

export default function FolderGrid({
  folders,
  isLoading,
  onDelete,
  onOpen,
  onUpdate
}: FolderGridProps) {
  if (isLoading) {
    return <div className="empty-state">Loading folders...</div>;
  }

  if (folders.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-title">Drag folders here to get started</div>
        <p>Drop one or more Finder folders into this window.</p>
      </div>
    );
  }

  return (
    <section className="folder-grid" aria-label="Saved folders">
      {folders.map((folder) => (
        <FolderCard
          folder={folder}
          key={folder.id}
          onDelete={onDelete}
          onOpen={onOpen}
          onUpdate={onUpdate}
        />
      ))}
    </section>
  );
}
