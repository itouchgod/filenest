import { useEffect, useState } from "react";
import type { FolderItem, FolderSetupOptions } from "../types/folder";
import TagEditor from "./TagEditor";

type FolderSetupPanelProps = {
  mode: "add" | "edit";
  folderPath: string;
  folder?: FolderItem;
  onSave: (options: FolderSetupOptions) => void;
  onSkip?: () => void;
  onClose: () => void;
};

function getDefaultName(folderPath: string, folder?: FolderItem) {
  if (folder?.name) return folder.name;
  const parts = folderPath.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) ?? folderPath;
}

export default function FolderSetupPanel({
  mode,
  folderPath,
  folder,
  onSave,
  onSkip,
  onClose
}: FolderSetupPanelProps) {
  const [tags, setTags] = useState<string[]>(folder?.tags ?? []);
  const [favorite, setFavorite] = useState(folder?.favorite ?? false);
  const [name, setName] = useState(getDefaultName(folderPath, folder));

  useEffect(() => {
    setTags(folder?.tags ?? []);
    setFavorite(folder?.favorite ?? false);
    setName(getDefaultName(folderPath, folder));
  }, [folder, folderPath, mode]);

  function handleSave() {
    const trimmedName = name.trim();
    onSave({
      tags,
      favorite,
      name: trimmedName || undefined
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="setup-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-panel-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="setup-panel-title">
          {mode === "add" ? "Add Folder" : "Edit Folder"}
        </h2>

        <section className="setup-section setup-primary">
          <label className="setup-label">Tags</label>
          <p className="setup-hint">Add tags to organize and filter folders.</p>
          <TagEditor tags={tags} onChange={setTags} />
        </section>

        <section className="setup-section setup-optional">
          <label className="setup-label">More options</label>
          <label className="setup-checkbox">
            <input
              checked={favorite}
              type="checkbox"
              onChange={(event) => setFavorite(event.target.checked)}
            />
            Add to favorites
          </label>
          <label className="setup-field">
            <span>Display name</span>
            <input
              placeholder="Leave empty to use folder name"
              spellCheck={false}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        </section>

        <section className="setup-section">
          <label className="setup-label">Path</label>
          <p className="setup-path">{folderPath}</p>
        </section>

        <div className="setup-actions">
          <button className="button-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          {mode === "add" && onSkip ? (
            <button className="button-secondary" type="button" onClick={onSkip}>
              Skip for now
            </button>
          ) : null}
          <button className="button-primary" type="button" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
