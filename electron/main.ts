import { app, BrowserWindow, ipcMain, shell } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { FolderItem } from "../src/types/folder";

let mainWindow: BrowserWindow | null = null;

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

async function readFolders(): Promise<FolderItem[]> {
  await ensureDataFile();

  try {
    const raw = await fs.readFile(getDataFilePath(), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeFolders(folders: FolderItem[]) {
  await ensureDataFile();
  await fs.writeFile(
    getDataFilePath(),
    JSON.stringify(folders, null, 2),
    "utf-8"
  );
}

async function assertDirectory(folderPath: string) {
  const stat = await fs.stat(folderPath);
  if (!stat.isDirectory()) {
    throw new Error("Only folders can be added to FileNest.");
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 860,
    minHeight: 560,
    title: "FileNest",
    backgroundColor: "#f5f5f7",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("folders:get", async () => {
  return readFolders();
});

ipcMain.handle("folders:add", async (_event, folderPath: string) => {
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

  const now = new Date().toISOString();
  const folder: FolderItem = {
    id: crypto.randomUUID(),
    name: path.basename(normalizedPath),
    path: normalizedPath,
    tags: [],
    favorite: false,
    openCount: 0,
    createdAt: now
  };

  const nextFolders = [folder, ...folders];
  await writeFolders(nextFolders);

  return folder;
});

ipcMain.handle("folders:update", async (_event, updatedFolder: FolderItem) => {
  const folders = await readFolders();
  const index = folders.findIndex((folder) => folder.id === updatedFolder.id);

  if (index === -1) {
    throw new Error("Folder record was not found.");
  }

  const nextFolder: FolderItem = {
    ...updatedFolder,
    tags: Array.from(new Set(updatedFolder.tags.map((tag) => tag.trim())))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
  };

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

  const openedFolder: FolderItem = {
    ...folders[index],
    openCount: folders[index].openCount + 1,
    lastOpenedAt: new Date().toISOString()
  };

  const nextFolders = [...folders];
  nextFolders[index] = openedFolder;
  await writeFolders(nextFolders);

  return openedFolder;
});
