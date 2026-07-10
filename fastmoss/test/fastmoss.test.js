const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const packageJSON = require("../package.json");
const {
  DEFAULT_DOWNLOAD_BASE_URL,
  ensureBinary,
  installCLI,
  resolvePlatformTarget,
  resolveCacheRoot,
  resolveBinaryPath,
  resolveDownloadBaseURL,
  buildDownloadURL,
  runCLI,
} = require("../lib/runtime");

for (const arg of ["--version", "-v", "version"]) {
  test(`runCLI handles ${arg} without resolving a binary`, async () => {
    let output = "";

    await runCLI({
      version: "1.2.3",
      args: [arg],
      platform: "unsupported",
      arch: "unsupported",
      stdout: {
        write(chunk) {
          output += chunk;
        },
      },
    });

    assert.equal(output, "1.2.3\n");
  });
}

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

test("resolveDownloadBaseURL defaults to FastMoss public GitHub release repo", () => {
  assert.equal(
    DEFAULT_DOWNLOAD_BASE_URL,
    "https://github.com/FastMoss/cli/releases/download",
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

test("ensureBinary notifies before downloading a missing binary", async () => {
  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "fastmoss-ensure-"),
  );
  const events = [];
  let resolveRequest;
  const requestReceived = new Promise((resolve) => {
    resolveRequest = resolve;
  });
  const server = http.createServer((request, response) => {
    events.push("request");
    resolveRequest();
    response.writeHead(200, { "Content-Type": "application/octet-stream" });
    response.end("#!/bin/sh\nexit 0\n");
  });

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();

    await ensureBinary({
      version: "1.2.3",
      env: {},
      platform: "linux",
      arch: "x64",
      homeDir: tempDir,
      configuredDownloadBaseURL: `http://127.0.0.1:${port}`,
      onDownloadStart(downloadURL) {
        events.push(`start:${downloadURL}`);
      },
    });
    await requestReceived;

    assert.deepEqual(events, [
      `start:http://127.0.0.1:${port}/v1.2.3/fastmoss-linux-amd64`,
      "request",
    ]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
});

test("installCLI skips predownload when FASTMOSS_SKIP_DOWNLOAD is set", async () => {
  let stderrOutput = "";

  const result = await installCLI({
    version: "1.2.3",
    env: { FASTMOSS_SKIP_DOWNLOAD: "1" },
    platform: "unsupported",
    arch: "unsupported",
    stderr: {
      write(chunk) {
        stderrOutput += chunk;
      },
    },
  });

  assert.deepEqual(result, { skipped: true });
  assert.match(stderrOutput, /Skipping fastmoss binary download/);
});

test("package runs postinstall predownload script", () => {
  assert.equal(packageJSON.scripts.postinstall, "node ./bin/postinstall.js");
});
