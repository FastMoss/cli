const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");

const { PLATFORM_TARGETS, resolvePlatformTarget } = require("../lib/targets");
const { resolvePlatformBinary, runCLI } = require("../lib/runtime");

test("all five supported Node targets map to npm packages and release assets", () => {
  assert.equal(Object.keys(PLATFORM_TARGETS).length, 5);
  assert.deepEqual(resolvePlatformTarget({ platform: "darwin", arch: "arm64" }), {
    packageName: "@fastmoss/cli-darwin-arm64",
    packageDir: "cli-darwin-arm64",
    assetName: "fastmoss-darwin-arm64",
    binaryName: "fastmoss-darwin-arm64",
    buildPath: "darwin-arm64/fastmoss",
    os: "darwin",
    cpu: "arm64",
  });
  assert.equal(
    resolvePlatformTarget({ platform: "win32", arch: "x64" }).binaryName,
    "fastmoss-windows-amd64.exe",
  );
});

test("unsupported targets fail without a download fallback", () => {
  assert.throws(
    () => resolvePlatformTarget({ platform: "linux", arch: "ppc64" }),
    /Unsupported platform: linux\/ppc64/,
  );
});

test("--version returns the main package version without resolving a binary", async () => {
  let output = "";
  const result = await runCLI({
    version: "1.2.3",
    args: ["--version"],
    platform: "unsupported",
    arch: "unsupported",
    stdout: {
      write(chunk) {
        output += chunk;
      },
    },
  });
  assert.deepEqual(result, { code: 0, signal: null });
  assert.equal(output, "1.2.3\n");
});

test("resolvePlatformBinary requires an exact-version platform package", () => {
  const packageJSONPath = "/registry/@fastmoss/cli-linux-amd64/package.json";
  let accessMode;
  const result = resolvePlatformBinary({
    version: "1.2.3",
    platform: "linux",
    arch: "x64",
    resolvePackageJSON() {
      return packageJSONPath;
    },
    readFileSync() {
      return JSON.stringify({ version: "1.2.3" });
    },
    accessSync(_filePath, mode) {
      accessMode = mode;
    },
  });
  assert.equal(
    result.binaryPath,
    path.join(path.dirname(packageJSONPath), "bin", "fastmoss-linux-amd64"),
  );
  assert.equal(accessMode, fs.constants.X_OK);
});

test("missing package error contains only the npm repair command", () => {
  assert.throws(
    () =>
      resolvePlatformBinary({
        version: "1.2.3",
        platform: "darwin",
        arch: "arm64",
        resolvePackageJSON() {
          const error = new Error("not found");
          error.code = "MODULE_NOT_FOUND";
          throw error;
        },
      }),
    /@fastmoss\/cli-darwin-arm64[\s\S]*npm install -g @fastmoss\/cli@1\.2\.3[\s\S]*--omit=optional/,
  );
});

test("platform package version mismatch fails before spawning", () => {
  assert.throws(
    () =>
      resolvePlatformBinary({
        version: "1.2.3",
        platform: "win32",
        arch: "x64",
        resolvePackageJSON() {
          return "C:\\pkg\\package.json";
        },
        readFileSync() {
          return JSON.stringify({ version: "1.2.2" });
        },
        accessSync() {},
      }),
    /expected 1\.2\.3, found 1\.2\.2/,
  );
});

test("runCLI forwards arguments and inherited stdio", async () => {
  let call;
  const child = new EventEmitter();
  const promise = runCLI({
    version: "1.2.3",
    args: ["help"],
    resolveBinary() {
      return { binaryPath: "/tmp/fastmoss" };
    },
    spawnFn(binaryPath, args, options) {
      call = { binaryPath, args, options };
      process.nextTick(() => child.emit("exit", 7, null));
      return child;
    },
  });
  assert.deepEqual(await promise, { code: 7, signal: null });
  assert.deepEqual(call, {
    binaryPath: "/tmp/fastmoss",
    args: ["help"],
    options: { stdio: "inherit" },
  });
});

test("runCLI reports the child signal to the entry point", async () => {
  const child = new EventEmitter();
  const promise = runCLI({
    version: "1.2.3",
    args: ["help"],
    resolveBinary() {
      return { binaryPath: "/tmp/fastmoss" };
    },
    spawnFn() {
      process.nextTick(() => child.emit("exit", null, "SIGTERM"));
      return child;
    },
  });
  assert.deepEqual(await promise, { code: null, signal: "SIGTERM" });
});
