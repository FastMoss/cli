const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  resolvePlatformTarget,
  resolveCacheRoot,
  resolveBinaryPath,
  resolveDownloadBaseURL,
  buildDownloadURL,
} = require("../lib/runtime");

test("resolvePlatformTarget maps darwin arm64 to GitHub release asset", () => {
  assert.deepEqual(
    resolvePlatformTarget({ platform: "darwin", arch: "arm64" }),
    {
      assetName: "fastmoss-darwin-arm64",
      binaryName: "fastmoss",
      cacheKey: "darwin-arm64",
    },
  );
});

test("resolvePlatformTarget maps windows x64 to exe asset", () => {
  assert.deepEqual(
    resolvePlatformTarget({ platform: "win32", arch: "x64" }),
    {
      assetName: "fastmoss-windows-amd64.exe",
      binaryName: "fastmoss.exe",
      cacheKey: "windows-amd64",
    },
  );
});

test("resolvePlatformTarget rejects unsupported platforms", () => {
  assert.throws(
    () => resolvePlatformTarget({ platform: "linux", arch: "ppc64" }),
    /Unsupported platform/,
  );
});

test("resolveCacheRoot uses override when provided", () => {
  assert.equal(
    resolveCacheRoot({
      env: { FASTMOSS_CACHE_DIR: "/tmp/fastmoss-cache" },
      homeDir: "/Users/demo",
    }),
    "/tmp/fastmoss-cache",
  );
});

test("resolveCacheRoot falls back to user home", () => {
  assert.equal(
    resolveCacheRoot({ env: {}, homeDir: "/Users/demo" }),
    path.join("/Users/demo", ".fastmoss", "bin"),
  );
});

test("resolveBinaryPath includes version and platform cache key", () => {
  assert.equal(
    resolveBinaryPath({
      cacheRoot: "/tmp/fastmoss-cache",
      version: "1.2.3",
      target: {
        cacheKey: "linux-amd64",
        binaryName: "fastmoss",
      },
    }),
    path.join("/tmp/fastmoss-cache", "1.2.3", "linux-amd64", "fastmoss"),
  );
});

test("resolveDownloadBaseURL prefers configured package value", () => {
  assert.equal(
    resolveDownloadBaseURL({
      env: {},
      configuredDownloadBaseURL: "https://github.com/example/public-release/releases/download/",
    }),
    "https://github.com/example/public-release/releases/download",
  );
});

test("buildDownloadURL defaults to configured GitHub releases", () => {
  assert.equal(
    buildDownloadURL({
      version: "1.2.3",
      target: { assetName: "fastmoss-darwin-amd64" },
      env: {},
      configuredDownloadBaseURL:
        "https://github.com/example/public-release/releases/download",
    }),
    "https://github.com/example/public-release/releases/download/v1.2.3/fastmoss-darwin-amd64",
  );
});

test("buildDownloadURL honors override base url", () => {
  assert.equal(
    buildDownloadURL({
      version: "1.2.3",
      target: { assetName: "fastmoss-linux-amd64" },
      env: { FASTMOSS_DOWNLOAD_BASE_URL: "https://downloads.example.com/releases" },
      configuredDownloadBaseURL:
        "https://github.com/example/public-release/releases/download",
    }),
    "https://downloads.example.com/releases/v1.2.3/fastmoss-linux-amd64",
  );
});
