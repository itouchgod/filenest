import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);
const releaseDir = path.join(rootDir, "release");

async function run(command, args) {
  await execFileAsync(command, args, { cwd: rootDir });
}

async function sha256File(filePath) {
  const buffer = await fs.readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

async function zipApp(arch) {
  const appDir =
    arch === process.arch
      ? path.join(releaseDir, "FileNest.app")
      : path.join(releaseDir, `mac-${arch}`, "FileNest.app");
  const zipPath = path.join(releaseDir, `FileNest-mac-${arch}.zip`);

  await fs.access(appDir);
  await fs.rm(zipPath, { force: true });
  await run("ditto", ["-c", "-k", "--sequesterRsrc", "--keepParent", appDir, zipPath]);

  return zipPath;
}

console.log("Building FileNest release artifacts…");
await run("npm", ["run", "build"]);
await run("node", ["scripts/package-mac.mjs", "--arch=arm64"]);
await run("node", ["scripts/package-mac.mjs", "--arch=x64"]);

const artifacts = [];
for (const arch of ["arm64", "x64"]) {
  artifacts.push(await zipApp(arch));

  const dmgScript = path.join(rootDir, "scripts", "create-dmg.mjs");
  await run("node", [dmgScript, `--arch=${arch}`]);
  artifacts.push(path.join(releaseDir, arch === process.arch ? "FileNest.dmg" : `FileNest-${arch}.dmg`));
}

const checksumLines = [];
for (const artifactPath of artifacts) {
  try {
    await fs.access(artifactPath);
    const hash = await sha256File(artifactPath);
    checksumLines.push(`${hash}  ${path.basename(artifactPath)}`);
  } catch {
    console.warn(`Skipping missing artifact: ${artifactPath}`);
  }
}

const checksumPath = path.join(releaseDir, "SHA256SUMS.txt");
await fs.writeFile(checksumPath, `${checksumLines.join("\n")}\n`, "utf8");

console.log(`Created ${artifacts.length} release artifacts under ${releaseDir}`);
console.log(`Wrote ${checksumPath}`);
