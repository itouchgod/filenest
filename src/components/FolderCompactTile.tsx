import { FolderOpen, Star } from "lucide-react";
import type { FolderItemWithStatus } from "../types/folder";

type FolderCompactTileProps = {
  folder: FolderItemWithStatus;
  onOpen: (folder: FolderItemWithStatus) => void;
};

export default function FolderCompactTile({
  folder,
  onOpen
}: FolderCompactTileProps) {
  const tooltip = [
    folder.path,
    folder.tags.length > 0 ? folder.tags.join(", ") : "No tags"
  ].join("\n");

  return (
    <button
      className={`folder-compact-tile ${folder.missing ? "folder-missing" : ""}`}
      title={tooltip}
      type="button"
      onClick={() => onOpen(folder)}
    >
      {folder.favorite ? (
        <Star
          className="compact-favorite"
          size={12}
          fill="currentColor"
        />
      ) : null}
      <FolderOpen size={22} />
      <span>{folder.name}</span>
      {folder.missing ? <span className="missing-dot" title="Missing" /> : null}
    </button>
  );
}
