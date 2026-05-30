import { Plus, X } from "lucide-react";
import { KeyboardEvent, useState } from "react";

type TagEditorProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
};

export default function TagEditor({ tags, onChange }: TagEditorProps) {
  const [draftTag, setDraftTag] = useState("");

  function addTag() {
    const nextTag = draftTag.trim();
    if (!nextTag || tags.includes(nextTag)) return;

    onChange([...tags, nextTag]);
    setDraftTag("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
  }

  return (
    <div className="tag-editor">
      <div className="folder-tags">
        {tags.map((tag) => (
          <span className="tag-pill" key={tag}>
            {tag}
            <button
              type="button"
              title={`Remove ${tag}`}
              onClick={() => onChange(tags.filter((item) => item !== tag))}
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
