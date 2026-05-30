import { Clock3, Download, Folder, Star, Upload } from "lucide-react";
import type { FolderFilter, FolderItem, FolderView } from "../types/folder";

type SidebarProps = {
  filter: FolderFilter;
  folders: FolderItem[];
  tags: string[];
  onExport: () => void;
  onFilterChange: (filter: FolderFilter) => void;
  onImport: () => void;
};

const navItems: Array<{
  label: string;
  view: FolderView;
  icon: typeof Folder;
}> = [
  { label: "All", view: "all", icon: Folder },
  { label: "Favorites", view: "favorites", icon: Star },
  { label: "Recent", view: "recent", icon: Clock3 }
];

export default function Sidebar({
  filter,
  folders,
  tags,
  onExport,
  onFilterChange,
  onImport
}: SidebarProps) {
  const favoriteCount = folders.filter((folder) => folder.favorite).length;

  return (
    <aside className="sidebar">
      <div className="window-drag-space" />
      <div className="sidebar-title">FileNest</div>

      <nav className="sidebar-nav" aria-label="Folder views">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = filter.view === item.view && !filter.tag;
          const count =
            item.view === "favorites" ? favoriteCount : folders.length;

          return (
            <button
              className={`sidebar-item ${isActive ? "active" : ""}`}
              key={item.view}
              type="button"
              onClick={() => onFilterChange({ view: item.view })}
            >
              <Icon size={17} />
              <span>{item.label}</span>
              <small>{count}</small>
            </button>
          );
        })}
      </nav>

      <section className="tag-section">
        <div className="sidebar-section-label">Tags</div>
        {tags.length > 0 ? (
          <div className="tag-list">
            {tags.map((tag) => {
              const isActive = filter.tag === tag;
              return (
                <button
                  className={`tag-filter ${isActive ? "active" : ""}`}
                  key={tag}
                  type="button"
                  onClick={() => onFilterChange({ view: "all", tag })}
                >
                  <span># {tag}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="sidebar-empty">No tags yet</div>
        )}
      </section>

      <div className="sidebar-footer">
        <button className="sidebar-action" type="button" onClick={onImport}>
          <Upload size={16} />
          <span>Import…</span>
        </button>
        <button className="sidebar-action" type="button" onClick={onExport}>
          <Download size={16} />
          <span>Export…</span>
        </button>
      </div>
    </aside>
  );
}
