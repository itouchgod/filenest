import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const electronApp = path.join(
  rootDir,
  "node_modules",
  "electron",
  "dist",
  "Electron.app"
);
const releaseDir = path.join(rootDir, "release");
const appName = "FileNest";
const appDir = path.join(releaseDir, `${appName}.app`);
const resourcesDir = path.join(appDir, "Contents", "Resources");
const packagedAppDir = path.join(resourcesDir, "app");
const macOsDir = path.join(appDir, "Contents", "MacOS");
const sourceExecutable = path.join(macOsDir, "Electron");
const targetExecutable = path.join(macOsDir, appName);
const plistPath = path.join(appDir, "Contents", "Info.plist");

async function copyIntoApp(source, destination) {
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

await fs.rm(appDir, { recursive: true, force: true });
await fs.mkdir(releaseDir, { recursive: true });
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
