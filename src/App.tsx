import { useEffect, useMemo, useState } from "react";
import type { FolderFilter, FolderItem } from "./types/folder";
import {
  addFolder,
  deleteFolder,
  filterFolders,
  getAllTags,
  getFolders,
  openFolder,
  updateFolder
} from "./store/folderStore";
import Sidebar from "./components/Sidebar";
import SearchBar from "./components/SearchBar";
import FolderGrid from "./components/FolderGrid";

type Notice = {
  kind: "info" | "error";
  message: string;
};

const initialFilter: FolderFilter = { view: "all" };

export default function App() {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [filter, setFilter] = useState<FolderFilter>(initialFilter);
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void refreshFolders();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function refreshFolders() {
    try {
      const nextFolders = await getFolders();
      setFolders(nextFolders);
    } catch (error) {
      showError(error);
    } finally {
      setIsLoading(false);
    }
  }

  function showError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    setNotice({ kind: "error", message });
  }

  async function handleDroppedFiles(files: FileList) {
    const paths = Array.from(files)
      .map((file) => window.fileNest.getPathForFile(file))
      .filter(Boolean);

    if (paths.length === 0) return;

    let addedCount = 0;
    let lastError = "";

    for (const folderPath of paths) {
      try {
        const folder = await addFolder(folderPath);
        setFolders((current) => [folder, ...current]);
        addedCount += 1;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    if (addedCount > 0) {
      setNotice({
        kind: "info",
        message: `${addedCount} folder${addedCount > 1 ? "s" : ""} added`
      });
    } else if (lastError) {
      setNotice({ kind: "error", message: lastError });
    }
  }

  async function handleOpenFolder(folder: FolderItem) {
    try {
      const openedFolder = await openFolder(folder.path);
      if (!openedFolder) return;

      setFolders((current) =>
        current.map((item) =>
          item.id === openedFolder.id ? openedFolder : item
        )
      );
    } catch (error) {
      showError(error);
    }
  }

  async function handleUpdateFolder(folder: FolderItem) {
    try {
      const nextFolder = await updateFolder(folder);
      setFolders((current) =>
        current.map((item) => (item.id === nextFolder.id ? nextFolder : item))
      );
    } catch (error) {
      showError(error);
    }
  }

  async function handleDeleteFolder(id: string) {
    try {
      await deleteFolder(id);
      setFolders((current) => current.filter((folder) => folder.id !== id));
    } catch (error) {
      showError(error);
    }
  }

  const tags = useMemo(() => getAllTags(folders), [folders]);
  const visibleFolders = useMemo(
    () => filterFolders(folders, filter, searchTerm),
    [folders, filter, searchTerm]
  );

  return (
    <div
      className={`app-shell ${isDragging ? "is-dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        void handleDroppedFiles(event.dataTransfer.files);
      }}
    >
      <Sidebar
        filter={filter}
        folders={folders}
        tags={tags}
        onFilterChange={setFilter}
      />

      <main className="content">
        <header className="top-bar">
          <div>
            <h1>FileNest</h1>
            <p>{visibleFolders.length} folders</p>
          </div>
          <SearchBar value={searchTerm} onChange={setSearchTerm} />
        </header>

        <FolderGrid
          folders={visibleFolders}
          isLoading={isLoading}
          onDelete={handleDeleteFolder}
          onOpen={handleOpenFolder}
          onUpdate={handleUpdateFolder}
        />
      </main>

      {isDragging ? (
        <div className="drop-overlay">Drag folders here to get started</div>
      ) : null}

      {notice ? (
        <div className={`notice notice-${notice.kind}`}>{notice.message}</div>
      ) : null}
    </div>
  );
}
