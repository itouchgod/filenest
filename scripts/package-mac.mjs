import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { downloadArtifact } from "@electron/get";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);
const arch =
  process.argv
    .find((arg) => arg.startsWith("--arch="))
    ?.replace("--arch=", "") || process.arch;
const validArchs = new Set(["arm64", "x64"]);

if (!validArchs.has(arch)) {
  throw new Error(`Unsupported macOS arch: ${arch}`);
}

const releaseDir = path.join(rootDir, "release");
const appName = "FileNest";
const appDir =
  arch === process.arch
    ? path.join(releaseDir, `${appName}.app`)
    : path.join(releaseDir, `mac-${arch}`, `${appName}.app`);
const resourcesDir = path.join(appDir, "Contents", "Resources");
const packagedAppDir = path.join(resourcesDir, "app");
const macOsDir = path.join(appDir, "Contents", "MacOS");
const sourceExecutable = path.join(macOsDir, "Electron");
const targetExecutable = path.join(macOsDir, appName);
const plistPath = path.join(appDir, "Contents", "Info.plist");

async function getLocalElectronVersion() {
  const packageJson = await fs.readFile(
    path.join(rootDir, "node_modules", "electron", "package.json"),
    "utf8"
  );
  return JSON.parse(packageJson).version;
}

async function getElectronApp() {
  if (arch === process.arch) {
    return path.join(
      rootDir,
      "node_modules",
      "electron",
      "dist",
      "Electron.app"
    );
  }

  const version = await getLocalElectronVersion();
  const cacheDir = path.join(releaseDir, ".electron-cache", `${version}-${arch}`);
  const appPath = path.join(cacheDir, "Electron.app");

  try {
    await fs.access(appPath);
    return appPath;
  } catch {
    await fs.rm(cacheDir, { recursive: true, force: true });
    await fs.mkdir(cacheDir, { recursive: true });
  }

  const zipPath = await downloadArtifact({
    version,
    platform: "darwin",
    arch,
    artifactName: "electron"
  });

  await execFileAsync("ditto", ["-x", "-k", zipPath, cacheDir]);
  return appPath;
}

async function copyIntoApp(source) {
  await fs.cp(path.join(rootDir, source), path.join(packagedAppDir, source), {
    recursive: true
  });
}

async function updateInfoPlist() {
  let plist = await fs.readFile(plistPath, "utf8");

  plist = plist
    .replaceAll("<string>Electron</string>", `<string>${appName}</string>`)
    .replace(
      /<key>CFBundleExecutable<\/key>\s*<string>.*?<\/string>/s,
      `<key>CFBundleExecutable</key>\n\t<string>${appName}</string>`
    )
    .replace(
      /<key>CFBundleIdentifier<\/key>\s*<string>.*?<\/string>/s,
      "<key>CFBundleIdentifier</key>\n\t<string>com.itouchgod.filenest</string>"
    )
    .replace(
      /<key>CFBundleName<\/key>\s*<string>.*?<\/string>/s,
      `<key>CFBundleName</key>\n\t<string>${appName}</string>`
    )
    .replace(
      /<key>CFBundleDisplayName<\/key>\s*<string>.*?<\/string>/s,
      `<key>CFBundleDisplayName</key>\n\t<string>${appName}</string>`
    );

  await fs.writeFile(plistPath, plist, "utf8");
}

const electronApp = await getElectronApp();

await fs.rm(appDir, { recursive: true, force: true });
await fs.mkdir(releaseDir, { recursive: true });
await fs.mkdir(path.dirname(appDir), { recursive: true });
await fs.cp(electronApp, appDir, { recursive: true, verbatimSymlinks: true });

await fs.rm(packagedAppDir, { recursive: true, force: true });
await fs.mkdir(packagedAppDir, { recursive: true });

await copyIntoApp("dist");
await copyIntoApp("dist-electron");

await fs.writeFile(
  path.join(packagedAppDir, "package.json"),
  JSON.stringify(
    {
      name: "filenest",
      version: "0.1.0",
      main: "dist-electron/electron/main.js"
    },
    null,
    2
  ),
  "utf8"
);

await fs.rename(sourceExecutable, targetExecutable);
await updateInfoPlist();
await fs.chmod(targetExecutable, 0o755);

console.log(`Created ${appDir}`);
