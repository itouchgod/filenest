import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);
const archArg = process.argv.find((arg) => arg.startsWith("--arch="));
const arch = archArg?.replace("--arch=", "") || process.env.FILENEST_ARCH || "arm64";
const releaseDir = path.join(rootDir, "release");
const appName = "FileNest";
const appDir =
  arch === process.arch
    ? path.join(releaseDir, `${appName}.app`)
    : path.join(releaseDir, `mac-${arch}`, `${appName}.app`);
const dmgPath = path.join(releaseDir, arch === process.arch ? `${appName}.dmg` : `FileNest-${arch}.dmg`);

async function assertAppBundle() {
  try {
    await fs.access(appDir);
  } catch {
    throw new Error(`Missing app bundle at ${appDir}. Run npm run package:mac:${arch} first.`);
  }
}

async function maybeSignApp() {
  const identity = process.env.CODESIGN_IDENTITY;
  if (!identity) {
    console.warn("CODESIGN_IDENTITY not set. Skipping code signing.");
    return;
  }

  await execFileAsync("codesign", [
    "--force",
    "--deep",
    "--sign",
    identity,
    appDir
  ]);
  console.log(`Signed ${appDir}`);
}

await assertAppBundle();
await maybeSignApp();
await fs.rm(dmgPath, { force: true });

await execFileAsync("hdiutil", [
  "create",
  "-volname",
  appName,
  "-srcfolder",
  appDir,
  "-ov",
  "-format",
  "UDZO",
  dmgPath
]);

console.log(`Created ${dmgPath}`);
