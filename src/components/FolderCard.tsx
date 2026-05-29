import { FolderOpen, Star, Trash2 } from "lucide-react";
import type { FolderItem } from "../types/folder";
import TagEditor from "./TagEditor";

type FolderCardProps = {
  folder: FolderItem;
  onDelete: (id: string) => void;
  onOpen: (folder: FolderItem) => void;
  onUpdate: (folder: FolderItem) => void;
};

function formatLastOpened(value?: string) {
  if (!value) return "Never opened";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export default function FolderCard({
  folder,
  onDelete,
  onOpen,
  onUpdate
}: FolderCardProps) {
  return (
    <article
      className="folder-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(folder)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(folder);
        }
      }}
    >
      <div className="folder-card-header">
        <div className="folder-icon">
          <FolderOpen size={24} />
        </div>
        <div className="folder-actions">
          <button
            className={`icon-button ${folder.favorite ? "favorite" : ""}`}
            type="button"
            title={folder.favorite ? "Remove favorite" : "Add favorite"}
            onClick={(event) => {
              event.stopPropagation();
              onUpdate({ ...folder, favorite: !folder.favorite });
            }}
          >
            <Star size={17} fill={folder.favorite ? "currentColor" : "none"} />
          </button>
          <button
            className="icon-button danger"
            type="button"
            title="Delete folder"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(folder.id);
            }}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <h2>{folder.name}</h2>
      <p className="folder-path" title={folder.path}>
        {folder.path}
      </p>

      <TagEditor folder={folder} onUpdate={onUpdate} />

      <div className="folder-meta">
        <span>{folder.openCount} opens</span>
        <span>{formatLastOpened(folder.lastOpenedAt)}</span>
      </div>
    </article>
  );
}
