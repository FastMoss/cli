const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { resolvePlatformTarget } = require("./targets");

function reinstallMessage(version) {
  return [
    `Run: npm install -g @fastmoss/cli@${version}`,
    "Do not install with --omit=optional.",
  ].join("\n");
}

function resolvePlatformBinary({
  version,
  platform = process.platform,
  arch = process.arch,
  resolvePackageJSON = (packageName) =>
    require.resolve(`${packageName}/package.json`),
  readFileSync = fs.readFileSync,
  accessSync = fs.accessSync,
} = {}) {
  const target = resolvePlatformTarget({ platform, arch });
  let packageJSONPath;
  try {
    packageJSONPath = resolvePackageJSON(target.packageName);
  } catch (error) {
    if (!error || error.code !== "MODULE_NOT_FOUND") throw error;
    throw new Error(
      [
        `FastMoss binary package for ${platform}/${arch} is missing: ${target.packageName}.`,
        reinstallMessage(version),
      ].join("\n"),
    );
  }

  const platformPackage = JSON.parse(readFileSync(packageJSONPath, "utf8"));
  if (platformPackage.version !== version) {
    throw new Error(
      [
        `FastMoss platform package version mismatch: expected ${version}, found ${platformPackage.version}.`,
        reinstallMessage(version),
      ].join("\n"),
    );
  }

  const binaryPath = path.join(
    path.dirname(packageJSONPath),
    "bin",
    target.binaryName,
  );
  try {
    accessSync(
      binaryPath,
      platform === "win32" ? fs.constants.F_OK : fs.constants.X_OK,
    );
  } catch {
    throw new Error(
      [
        `FastMoss binary is missing or not executable: ${binaryPath}.`,
        reinstallMessage(version),
      ].join("\n"),
    );
  }
  return { binaryPath, target };
}

async function runCLI({
  version,
  args = process.argv.slice(2),
  platform = process.platform,
  arch = process.arch,
  stdout = process.stdout,
  resolveBinary = resolvePlatformBinary,
  spawnFn = spawn,
} = {}) {
  if (args.length === 1 && ["--version", "-v", "version"].includes(args[0])) {
    stdout.write(`${version}\n`);
    return { code: 0, signal: null };
  }

  const { binaryPath } = resolveBinary({ version, platform, arch });
  return new Promise((resolve, reject) => {
    const child = spawnFn(binaryPath, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

module.exports = { reinstallMessage, resolvePlatformBinary, runCLI };
