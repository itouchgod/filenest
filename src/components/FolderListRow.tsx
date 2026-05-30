import { FolderOpen, Pencil, Star, Trash2 } from "lucide-react";
import type { FolderItemWithStatus } from "../types/folder";
import { formatLastOpened, truncatePath } from "../utils/folderDisplay";

type FolderListRowProps = {
  folder: FolderItemWithStatus;
  onEdit: (folder: FolderItemWithStatus) => void;
  onOpen: (folder: FolderItemWithStatus) => void;
  onRequestDelete: (id: string) => void;
};

export default function FolderListRow({
  folder,
  onEdit,
  onOpen,
  onRequestDelete
}: FolderListRowProps) {
  return (
    <article
      className={`folder-list-row ${folder.missing ? "folder-missing" : ""}`}
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
      <div className="folder-list-icon">
        <FolderOpen size={18} />
      </div>

      <div className="folder-list-main">
        <div className="folder-list-title">
          <strong>{folder.name}</strong>
          {folder.missing ? <span className="missing-badge">Missing</span> : null}
        </div>
        <span className="folder-list-path" title={folder.path}>
          {truncatePath(folder.path, 56)}
        </span>
      </div>

      <div className="folder-list-tags">
        {folder.tags.map((tag) => (
          <span className="tag-pill tag-pill-readonly" key={tag}>
            {tag}
          </span>
        ))}
      </div>

      <div className="folder-list-meta">
        {folder.favorite ? (
          <Star className="favorite-star" size={15} fill="currentColor" />
        ) : null}
        <span>{folder.openCount} opens</span>
        <span>{formatLastOpened(folder.lastOpenedAt)}</span>
      </div>

      <div className="folder-list-actions">
        <button
          className="icon-button"
          type="button"
          title="Edit folder"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(folder);
          }}
        >
          <Pencil size={15} />
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
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}
