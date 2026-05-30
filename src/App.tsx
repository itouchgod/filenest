import { useEffect, useMemo, useState } from "react";
import type {
  DisplayLayout,
  FolderFilter,
  FolderItem,
  FolderItemWithStatus,
  FolderSetupOptions
} from "./types/folder";
import {
  addFolderWithOptions,
  countMissingFolders,
  deleteFolder,
  exportFoldersToFile,
  filterFolders,
  getAllTags,
  getDroppedPath,
  getFolders,
  importFoldersFromFile,
  openFolder,
  updateFolder
} from "./store/folderStore";
import Sidebar from "./components/Sidebar";
import SearchBar from "./components/SearchBar";
import FolderView from "./components/FolderView";
import FolderSetupPanel from "./components/FolderSetupPanel";
import ConfirmDialog from "./components/ConfirmDialog";
import LayoutSwitcher from "./components/LayoutSwitcher";

type Notice = {
  kind: "info" | "error";
  message: string;
};

type SetupState =
  | { mode: "add"; path: string }
  | { mode: "edit"; folder: FolderItemWithStatus };

const initialFilter: FolderFilter = { view: "all" };
const layoutStorageKey = "filenest.displayLayout";

function readStoredLayout(): DisplayLayout {
  const stored = window.localStorage.getItem(layoutStorageKey);
  if (stored === "grid" || stored === "list" || stored === "compact") {
    return stored;
  }
  return "grid";
}

export default function App() {
  const [folders, setFolders] = useState<FolderItemWithStatus[]>([]);
  const [filter, setFilter] = useState<FolderFilter>(initialFilter);
  const [searchTerm, setSearchTerm] = useState("");
  const [layout, setLayout] = useState<DisplayLayout>(() => readStoredLayout());
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [setupState, setSetupState] = useState<SetupState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FolderItemWithStatus | null>(
    null
  );

  useEffect(() => {
    void refreshFolders();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    window.localStorage.setItem(layoutStorageKey, layout);
  }, [layout]);

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

  function showInfo(message: string) {
    setNotice({ kind: "info", message });
  }

  async function handleDroppedFiles(files: FileList) {
    const paths = Array.from(files)
      .map((file) => getDroppedPath(file))
      .filter(Boolean);

    if (paths.length === 0) return;

    setSetupState({ mode: "add", path: paths[0] });

    if (paths.length > 1) {
      showInfo(`Configure the first folder. Drop others one at a time.`);
    }
  }

  async function handleOpenFolder(folder: FolderItemWithStatus) {
    if (folder.missing) {
      showError("This folder path is missing or invalid.");
      return;
    }

    try {
      const openedFolder = await openFolder(folder.path);
      if (!openedFolder) return;

      setFolders((current) =>
        current.map((item) =>
          item.id === openedFolder.id
            ? { ...openedFolder, missing: false }
            : item
        )
      );
    } catch (error) {
      showError(error);
    }
  }

  async function handleSetupSave(options: FolderSetupOptions) {
    if (!setupState) return;

    try {
      if (setupState.mode === "add") {
        const folder = await addFolderWithOptions(setupState.path, options);
        setFolders((current) => [{ ...folder, missing: false }, ...current]);
        showInfo(`Added "${folder.name}"`);
      } else {
        const nextFolder = await updateFolder({
          ...setupState.folder,
          tags: options.tags ?? setupState.folder.tags,
          favorite: options.favorite ?? setupState.folder.favorite,
          name:
            options.name?.trim() ||
            setupState.folder.name
        });
        setFolders((current) =>
          current.map((item) =>
            item.id === nextFolder.id ? { ...nextFolder, missing: item.missing } : item
          )
        );
        showInfo(`Updated "${nextFolder.name}"`);
      }

      setSetupState(null);
    } catch (error) {
      showError(error);
    }
  }

  async function handleSetupSkip() {
    if (!setupState || setupState.mode !== "add") return;

    try {
      const folder = await addFolderWithOptions(setupState.path);
      setFolders((current) => [{ ...folder, missing: false }, ...current]);
      showInfo(`Added "${folder.name}"`);
      setSetupState(null);
    } catch (error) {
      showError(error);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;

    try {
      await deleteFolder(pendingDelete.id);
      setFolders((current) =>
        current.filter((folder) => folder.id !== pendingDelete.id)
      );
      showInfo(`Removed "${pendingDelete.name}"`);
      setPendingDelete(null);
    } catch (error) {
      showError(error);
    }
  }

  async function handleExport() {
    try {
      const filePath = await exportFoldersToFile();
      if (filePath) showInfo(`Exported to ${filePath}`);
    } catch (error) {
      showError(error);
    }
  }

  async function handleImport() {
    try {
      const result = await importFoldersFromFile();
      if (!result) return;

      await refreshFolders();
      showInfo(
        `Import complete: ${result.added} added, ${result.skipped} skipped, ${result.invalid} invalid`
      );
    } catch (error) {
      showError(error);
    }
  }

  const tags = useMemo(() => getAllTags(folders), [folders]);
  const visibleFolders = useMemo(
    () => filterFolders(folders, filter, searchTerm),
    [folders, filter, searchTerm]
  );
  const missingCount = useMemo(() => countMissingFolders(folders), [folders]);

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
        onExport={handleExport}
        onFilterChange={setFilter}
        onImport={handleImport}
      />

      <main className="content">
        <header className="top-bar">
          <div>
            <h1>FileNest</h1>
            <p>{visibleFolders.length} folders</p>
          </div>
          <div className="top-bar-actions">
            <SearchBar value={searchTerm} onChange={setSearchTerm} />
            <LayoutSwitcher value={layout} onChange={setLayout} />
          </div>
        </header>

        {missingCount > 0 ? (
          <div className="missing-banner">
            {missingCount} folder{missingCount > 1 ? "s" : ""} have missing paths.
          </div>
        ) : null}

        <FolderView
          folders={visibleFolders}
          isLoading={isLoading}
          layout={layout}
          onEdit={(folder) => setSetupState({ mode: "edit", folder })}
          onOpen={handleOpenFolder}
          onRequestDelete={(id) => {
            const folder = folders.find((item) => item.id === id);
            if (folder) setPendingDelete(folder);
          }}
        />
      </main>

      {isDragging ? (
        <div className="drop-overlay">Drag folders here to get started</div>
      ) : null}

      {notice ? (
        <div className={`notice notice-${notice.kind}`}>{notice.message}</div>
      ) : null}

      {setupState ? (
        <FolderSetupPanel
          folder={setupState.mode === "edit" ? setupState.folder : undefined}
          folderPath={
            setupState.mode === "add"
              ? setupState.path
              : setupState.folder.path
          }
          mode={setupState.mode}
          onClose={() => setSetupState(null)}
          onSave={handleSetupSave}
          onSkip={setupState.mode === "add" ? handleSetupSkip : undefined}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          confirmLabel="Remove"
          message={`Remove "${pendingDelete.name}" from FileNest? This will not delete the folder on disk.`}
          title="Remove folder?"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void handleConfirmDelete()}
        />
      ) : null}
    </div>
  );
}
