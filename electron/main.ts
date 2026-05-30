import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeImage, shell, Tray } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type {
  FolderItem,
  FolderItemWithStatus,
  FolderSetupOptions,
  ImportResult
} from "../src/types/folder";
import {
  dedupeTags,
  resolveImportId,
  toPersistedFolder
} from "../src/utils/persistedFolder";

let mainWindow: BrowserWindow | null = null;
let panelWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

function getDataFilePath() {
  return path.join(app.getPath("userData"), "folders.json");
}

async function ensureDataFile() {
  const dataFilePath = getDataFilePath();
  await fs.mkdir(path.dirname(dataFilePath), { recursive: true });

  try {
    await fs.access(dataFilePath);
  } catch {
    await fs.writeFile(dataFilePath, "[]", "utf-8");
  }
}

async function backupCorruptFile(raw: string) {
  const dataFilePath = getDataFilePath();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(
    path.dirname(dataFilePath),
    `folders.corrupt-${stamp}.json`
  );

  await fs.writeFile(backupPath, raw, "utf-8");
  await fs.writeFile(dataFilePath, "[]", "utf-8");
  console.warn(`Backed up corrupt folders.json to ${backupPath}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

async function readFolders(): Promise<FolderItem[]> {
  await ensureDataFile();
  const dataFilePath = getDataFilePath();

  let raw = "";
  try {
    raw = await fs.readFile(dataFilePath, "utf-8");
  } catch {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      await backupCorruptFile(raw);
      return [];
    }

    return parsed
      .filter(
        (item): item is Partial<FolderItem> & { path: string } =>
          isRecord(item) &&
          typeof item.path === "string" &&
          item.path.trim().length > 0
      )
      .map((item) => toPersistedFolder(item));
  } catch {
    await backupCorruptFile(raw);
    return [];
  }
}

async function writeFolders(folders: FolderItem[]) {
  await ensureDataFile();
  const persisted = folders.map((folder) => toPersistedFolder(folder));
  await fs.writeFile(
    getDataFilePath(),
    JSON.stringify(persisted, null, 2),
    "utf-8"
  );
}

async function assertDirectory(folderPath: string) {
  const stat = await fs.stat(folderPath);
  if (!stat.isDirectory()) {
    throw new Error("Only folders can be added to FileNest.");
  }
}

async function isFolderMissing(folderPath: string) {
  try {
    await fs.access(folderPath);
    const stat = await fs.stat(folderPath);
    return !stat.isDirectory();
  } catch {
    return true;
  }
}

async function readFoldersWithStatus(): Promise<FolderItemWithStatus[]> {
  const folders = await readFolders();
  return Promise.all(
    folders.map(async (folder) => ({
      ...folder,
      missing: await isFolderMissing(folder.path)
    }))
  );
}

function normalizeOptions(
  folderPath: string,
  options?: FolderSetupOptions
) {
  const normalizedPath = path.normalize(folderPath);
  return {
    tags: dedupeTags(options?.tags ?? []),
    favorite: options?.favorite ?? false,
    name: options?.name?.trim() || path.basename(normalizedPath)
  };
}

function getWindowUrl(panelMode = false) {
  const suffix = panelMode ? "?mode=panel" : "";

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    return `${process.env.VITE_DEV_SERVER_URL}${suffix}`;
  }

  const indexPath = path.join(__dirname, "../../dist/index.html");
  return panelMode ? `${indexPath}${suffix}` : indexPath;
}

function loadWindowContents(window: BrowserWindow, panelMode = false) {
  const target = getWindowUrl(panelMode);

  if (target.startsWith("http")) {
    void window.loadURL(target);
    return;
  }

  if (panelMode) {
    void window.loadFile(target.split("?")[0], {
      search: "mode=panel"
    });
    return;
  }

  void window.loadFile(target);
}

function getPreloadPath() {
  return path.join(__dirname, "preload.js");
}

function getSharedWebPreferences() {
  return {
    preload: getPreloadPath(),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false
  } as const;
}

function attachWindowCleanup(
  window: BrowserWindow,
  onClosed: () => void
) {
  window.on("closed", onClosed);
}

function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 860,
    minHeight: 560,
    title: "FileNest",
    backgroundColor: "#f5f5f7",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: getSharedWebPreferences()
  });

  attachWindowCleanup(mainWindow, () => {
    mainWindow = null;
  });

  loadWindowContents(mainWindow);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  return mainWindow;
}

function createPanelWindow(): BrowserWindow {
  panelWindow = new BrowserWindow({
    width: 360,
    height: 480,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    title: "FileNest",
    backgroundColor: "#f5f5f7",
    webPreferences: getSharedWebPreferences()
  });

  attachWindowCleanup(panelWindow, () => {
    panelWindow = null;
  });

  loadWindowContents(panelWindow, true);
  return panelWindow;
}

function toggleMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = null;
    const window = createMainWindow();
    window.show();
    window.focus();
    return;
  }

  if (mainWindow.isVisible()) {
    mainWindow.hide();
    return;
  }

  mainWindow.show();
  mainWindow.focus();
}

function positionPanelWindow() {
  if (!panelWindow || panelWindow.isDestroyed() || !tray) return;

  const trayBounds = tray.getBounds();
  const windowBounds = panelWindow.getBounds();
  const x = Math.round(
    trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2
  );
  const y = Math.round(trayBounds.y + trayBounds.height + 4);

  panelWindow.setPosition(x, y, false);
}

function togglePanelWindow() {
  if (!panelWindow || panelWindow.isDestroyed()) {
    panelWindow = null;
    createPanelWindow();
  }

  if (!panelWindow || panelWindow.isDestroyed()) return;

  if (panelWindow.isVisible()) {
    panelWindow.hide();
    return;
  }

  positionPanelWindow();
  panelWindow.show();
  panelWindow.focus();
}

function createTray() {
  const iconPath = path.join(__dirname, "../../assets/trayTemplate.png");
  let trayIcon = nativeImage.createFromPath(iconPath);

  if (trayIcon.isEmpty()) {
    trayIcon = nativeImage.createFromDataURL(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAIElEQVR42mNgGAWjYGBg+M8ABYwMDAz/gBEwYsQYGf4zMDD8Z2BguIKRQQEAGRkBBlRk3UgAAAAASUVORK5CYII="
    );
  }

  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  tray.setToolTip("FileNest");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open FileNest",
      click: () => toggleMainWindow()
    },
    {
      label: "Show Panel",
      click: () => togglePanelWindow()
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => app.quit()
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on("click", () => togglePanelWindow());
}

function registerGlobalShortcut() {
  const shortcut = "CommandOrControl+Shift+F";
  const registered = globalShortcut.register(shortcut, () => {
    toggleMainWindow();
  });

  if (!registered) {
    console.warn(`Failed to register global shortcut: ${shortcut}`);
  }
}

app.whenReady().then(() => {
  createMainWindow();
  createTray();
  registerGlobalShortcut();

  app.on("activate", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createMainWindow();
      return;
    }

    mainWindow.show();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

async function addFolderRecord(
  folderPath: string,
  options?: FolderSetupOptions
) {
  if (!folderPath) throw new Error("Folder path is required.");

  await assertDirectory(folderPath);

  const folders = await readFolders();
  const normalizedPath = path.normalize(folderPath);
  const exists = folders.some(
    (folder) => path.normalize(folder.path) === normalizedPath
  );

  if (exists) {
    throw new Error("This folder already exists in FileNest.");
  }

  const normalized = normalizeOptions(folderPath, options);
  const now = new Date().toISOString();
  const folder = toPersistedFolder({
    id: crypto.randomUUID(),
    name: normalized.name,
    path: normalizedPath,
    tags: normalized.tags,
    favorite: normalized.favorite,
    openCount: 0,
    createdAt: now
  });

  const nextFolders = [folder, ...folders];
  await writeFolders(nextFolders);

  return folder;
}

ipcMain.handle("folders:get", async () => {
  return readFoldersWithStatus();
});

ipcMain.handle("folders:add", async (_event, folderPath: string) => {
  return addFolderRecord(folderPath);
});

ipcMain.handle(
  "folders:addWithOptions",
  async (_event, folderPath: string, options?: FolderSetupOptions) => {
    return addFolderRecord(folderPath, options);
  }
);

ipcMain.handle("folders:update", async (_event, updatedFolder: FolderItem) => {
  const folders = await readFolders();
  const index = folders.findIndex((folder) => folder.id === updatedFolder.id);

  if (index === -1) {
    throw new Error("Folder record was not found.");
  }

  const existing = folders[index];
  const nextFolder = toPersistedFolder(updatedFolder, existing);
  nextFolder.id = existing.id;

  const nextFolders = [...folders];
  nextFolders[index] = nextFolder;
  await writeFolders(nextFolders);

  return nextFolder;
});

ipcMain.handle("folders:delete", async (_event, id: string) => {
  const folders = await readFolders();
  const nextFolders = folders.filter((folder) => folder.id !== id);
  await writeFolders(nextFolders);

  return id;
});

ipcMain.handle("folders:open", async (_event, folderPath: string) => {
  if (await isFolderMissing(folderPath)) {
    throw new Error("This folder path is missing or invalid.");
  }

  const errorMessage = await shell.openPath(folderPath);

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  const folders = await readFolders();
  const normalizedPath = path.normalize(folderPath);
  const index = folders.findIndex(
    (folder) => path.normalize(folder.path) === normalizedPath
  );

  if (index === -1) return null;

  const existing = folders[index];
  const openedFolder = toPersistedFolder(
    {
      ...existing,
      openCount: existing.openCount + 1,
      lastOpenedAt: new Date().toISOString()
    },
    existing
  );

  const nextFolders = [...folders];
  nextFolders[index] = openedFolder;
  await writeFolders(nextFolders);

  return openedFolder;
});

ipcMain.handle("folders:exportToFile", async () => {
  const folders = await readFolders();
  const date = new Date().toISOString().slice(0, 10);
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Export FileNest folders",
    defaultPath: `filenest-export-${date}.json`,
    filters: [{ name: "JSON", extensions: ["json"] }]
  });

  if (canceled || !filePath) return null;

  await fs.writeFile(filePath, JSON.stringify(folders, null, 2), "utf-8");
  return filePath;
});

ipcMain.handle("folders:importFromFile", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Import FileNest folders",
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }]
  });

  if (canceled || filePaths.length === 0) return null;

  const raw = await fs.readFile(filePaths[0], "utf-8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid import file.");
  }

  return importFolderItems(parsed as FolderItem[]);
});

ipcMain.handle("folders:import", async (_event, items: FolderItem[]) => {
  return importFolderItems(items);
});

async function importFolderItems(items: FolderItem[]): Promise<ImportResult> {
  const folders = await readFolders();
  const existingPaths = new Set(
    folders.map((folder) => path.normalize(folder.path))
  );
  const reservedIds = new Set(folders.map((folder) => folder.id));

  let added = 0;
  let skipped = 0;
  let invalid = 0;
  const next = [...folders];

  for (const item of items) {
    if (!item?.path) {
      invalid += 1;
      continue;
    }

    const normalizedPath = path.normalize(item.path);

    if (existingPaths.has(normalizedPath)) {
      skipped += 1;
      continue;
    }

    try {
      await assertDirectory(item.path);
    } catch {
      invalid += 1;
      continue;
    }

    existingPaths.add(normalizedPath);
    next.unshift(
      toPersistedFolder(
        {
          ...item,
          id: resolveImportId(item.id, reservedIds),
          path: normalizedPath,
          name: item.name?.trim() || path.basename(normalizedPath)
        },
        {
          createdAt: item.createdAt || new Date().toISOString()
        }
      )
    );
    added += 1;
  }

  await writeFolders(next);
  return { added, skipped, invalid };
}
