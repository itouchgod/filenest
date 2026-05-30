import type { DisplayLayout, FolderItemWithStatus } from "../types/folder";
import FolderCard from "./FolderCard";
import FolderCompactTile from "./FolderCompactTile";
import FolderListRow from "./FolderListRow";

type FolderViewProps = {
  folders: FolderItemWithStatus[];
  isLoading: boolean;
  layout: DisplayLayout;
  onEdit: (folder: FolderItemWithStatus) => void;
  onOpen: (folder: FolderItemWithStatus) => void;
  onRequestDelete: (id: string) => void;
};

export default function FolderView({
  folders,
  isLoading,
  layout,
  onEdit,
  onOpen,
  onRequestDelete
}: FolderViewProps) {
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

  if (layout === "list") {
    return (
      <section aria-label="Saved folders" className="folder-list">
        {folders.map((folder) => (
          <FolderListRow
            folder={folder}
            key={folder.id}
            onEdit={onEdit}
            onOpen={onOpen}
            onRequestDelete={onRequestDelete}
          />
        ))}
      </section>
    );
  }

  if (layout === "compact") {
    return (
      <section
        aria-label="Saved folders"
        className="folder-compact-grid"
      >
        {folders.map((folder) => (
          <FolderCompactTile
            folder={folder}
            key={folder.id}
            onOpen={onOpen}
          />
        ))}
      </section>
    );
  }

  return (
    <section aria-label="Saved folders" className="folder-grid">
      {folders.map((folder) => (
        <FolderCard
          folder={folder}
          key={folder.id}
          onEdit={onEdit}
          onOpen={onOpen}
          onRequestDelete={onRequestDelete}
        />
      ))}
    </section>
  );
}
