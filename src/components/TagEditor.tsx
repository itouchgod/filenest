import { Plus, X } from "lucide-react";
import { KeyboardEvent, useState } from "react";
import type { FolderItem } from "../types/folder";

type TagEditorProps = {
  folder: FolderItem;
  onUpdate: (folder: FolderItem) => void;
};

export default function TagEditor({ folder, onUpdate }: TagEditorProps) {
  const [draftTag, setDraftTag] = useState("");

  function addTag() {
    const nextTag = draftTag.trim();
    if (!nextTag || folder.tags.includes(nextTag)) return;

    onUpdate({
      ...folder,
      tags: [...folder.tags, nextTag]
    });
    setDraftTag("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
  }

  return (
    <div
      className="tag-editor"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className="folder-tags">
        {folder.tags.map((tag) => (
          <span className="tag-pill" key={tag}>
            {tag}
            <button
              type="button"
              title={`Remove ${tag}`}
              onClick={() =>
                onUpdate({
                  ...folder,
                  tags: folder.tags.filter((item) => item !== tag)
                })
              }
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>

      <div className="tag-input">
        <input
          value={draftTag}
          onChange={(event) => setDraftTag(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add tag"
          spellCheck={false}
        />
        <button type="button" title="Add tag" onClick={addTag}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
