const PLATFORM_TARGETS = Object.freeze({
  "darwin:x64": Object.freeze({
    packageName: "@fastmoss/cli-darwin-amd64",
    packageDir: "cli-darwin-amd64",
    assetName: "fastmoss-darwin-amd64",
    binaryName: "fastmoss-darwin-amd64",
    buildPath: "darwin-amd64/fastmoss",
    os: "darwin",
    cpu: "x64",
  }),
  "darwin:arm64": Object.freeze({
    packageName: "@fastmoss/cli-darwin-arm64",
    packageDir: "cli-darwin-arm64",
    assetName: "fastmoss-darwin-arm64",
    binaryName: "fastmoss-darwin-arm64",
    buildPath: "darwin-arm64/fastmoss",
    os: "darwin",
    cpu: "arm64",
  }),
  "linux:x64": Object.freeze({
    packageName: "@fastmoss/cli-linux-amd64",
    packageDir: "cli-linux-amd64",
    assetName: "fastmoss-linux-amd64",
    binaryName: "fastmoss-linux-amd64",
    buildPath: "linux-amd64/fastmoss",
    os: "linux",
    cpu: "x64",
  }),
  "linux:arm64": Object.freeze({
    packageName: "@fastmoss/cli-linux-arm64",
    packageDir: "cli-linux-arm64",
    assetName: "fastmoss-linux-arm64",
    binaryName: "fastmoss-linux-arm64",
    buildPath: "linux-arm64/fastmoss",
    os: "linux",
    cpu: "arm64",
  }),
  "win32:x64": Object.freeze({
    packageName: "@fastmoss/cli-windows-amd64",
    packageDir: "cli-windows-amd64",
    assetName: "fastmoss-windows-amd64.exe",
    binaryName: "fastmoss-windows-amd64.exe",
    buildPath: "windows-amd64/fastmoss.exe",
    os: "win32",
    cpu: "x64",
  }),
});

function resolvePlatformTarget({
  platform = process.platform,
  arch = process.arch,
} = {}) {
  const target = PLATFORM_TARGETS[`${platform}:${arch}`];
  if (!target) {
    const supported = Object.keys(PLATFORM_TARGETS)
      .map((key) => key.replace(":", "/"))
      .join(", ");
    throw new Error(
      `Unsupported platform: ${platform}/${arch}. Supported targets: ${supported}`,
    );
  }
  return target;
}

module.exports = { PLATFORM_TARGETS, resolvePlatformTarget };
