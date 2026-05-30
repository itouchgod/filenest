import { FolderOpen, Pencil, Star, Trash2 } from "lucide-react";
import type { FolderItemWithStatus } from "../types/folder";
import { formatLastOpened } from "../utils/folderDisplay";

type FolderCardProps = {
  folder: FolderItemWithStatus;
  onEdit: (folder: FolderItemWithStatus) => void;
  onOpen: (folder: FolderItemWithStatus) => void;
  onRequestDelete: (id: string) => void;
};

export default function FolderCard({
  folder,
  onEdit,
  onOpen,
  onRequestDelete
}: FolderCardProps) {
  return (
    <article
      className={`folder-card ${folder.missing ? "folder-missing" : ""}`}
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
          {folder.missing ? (
            <span className="missing-badge">Missing</span>
          ) : null}
          {folder.favorite ? (
            <span className="icon-button favorite" title="Favorite">
              <Star size={17} fill="currentColor" />
            </span>
          ) : null}
          <button
            className="icon-button"
            type="button"
            title="Edit folder"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(folder);
            }}
          >
            <Pencil size={16} />
          </button>
          <button
            className="icon-button danger"
            type="button"
            title="Delete folder"
            onClick={(event) => {
              event.stopPropagation();
              onRequestDelete(folder.id);
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

      {folder.tags.length > 0 ? (
        <div className="folder-tags">
          {folder.tags.map((tag) => (
            <span className="tag-pill tag-pill-readonly" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <p className="folder-tags-empty">No tags</p>
      )}

      <div className="folder-meta">
        <span>{folder.openCount} opens</span>
        <span>{formatLastOpened(folder.lastOpenedAt)}</span>
      </div>
    </article>
  );
}
