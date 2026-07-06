const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const https = require("node:https");
const { pipeline } = require("node:stream/promises");
const { spawn } = require("node:child_process");

const DEFAULT_DOWNLOAD_BASE_URL =
  "https://github.com/fastmoss/fastmoss-release/releases/download";

const PLATFORM_TARGETS = {
  "darwin:x64": {
    assetName: "fastmoss-darwin-amd64",
    binaryName: "fastmoss",
    cacheKey: "darwin-amd64",
  },
  "darwin:arm64": {
    assetName: "fastmoss-darwin-arm64",
    binaryName: "fastmoss",
    cacheKey: "darwin-arm64",
  },
  "linux:x64": {
    assetName: "fastmoss-linux-amd64",
    binaryName: "fastmoss",
    cacheKey: "linux-amd64",
  },
  "linux:arm64": {
    assetName: "fastmoss-linux-arm64",
    binaryName: "fastmoss",
    cacheKey: "linux-arm64",
  },
  "win32:x64": {
    assetName: "fastmoss-windows-amd64.exe",
    binaryName: "fastmoss.exe",
    cacheKey: "windows-amd64",
  },
};

function resolvePlatformTarget({
  platform = process.platform,
  arch = process.arch,
} = {}) {
  const key = `${platform}:${arch}`;
  const target = PLATFORM_TARGETS[key];
  if (!target) {
    throw new Error(
      `Unsupported platform: ${platform}/${arch}. Supported targets: ${Object.keys(
        PLATFORM_TARGETS,
      )
        .map((value) => value.replace(":", "/"))
        .join(", ")}`,
    );
  }
  return target;
}

function resolveCacheRoot({
  env = process.env,
  homeDir = os.homedir(),
} = {}) {
  const override = String(env.FASTMOSS_CACHE_DIR || "").trim();
  if (override !== "") {
    return override;
  }
  return path.join(homeDir, ".fastmoss", "bin");
}

function resolveBinaryPath({ cacheRoot, version, target }) {
  return path.join(cacheRoot, version, target.cacheKey, target.binaryName);
}

function resolveDownloadBaseURL({
  env = process.env,
  configuredDownloadBaseURL = "",
} = {}) {
  const envOverride = String(env.FASTMOSS_DOWNLOAD_BASE_URL || "").trim();
  if (envOverride !== "") {
    return envOverride.replace(/\/+$/, "");
  }

  const configured = String(configuredDownloadBaseURL || "").trim();
  if (configured !== "") {
    return configured.replace(/\/+$/, "");
  }

  return DEFAULT_DOWNLOAD_BASE_URL;
}

function buildDownloadURL({
  version,
  target,
  env = process.env,
  configuredDownloadBaseURL = "",
}) {
  const baseURL = resolveDownloadBaseURL({ env, configuredDownloadBaseURL });
  return `${baseURL}/v${version}/${target.assetName}`;
}

async function ensureBinary({
  version,
  env = process.env,
  platform = process.platform,
  arch = process.arch,
  homeDir = os.homedir(),
  configuredDownloadBaseURL = "",
}) {
  const target = resolvePlatformTarget({ platform, arch });
  const cacheRoot = resolveCacheRoot({ env, homeDir });
  const binaryPath = resolveBinaryPath({ cacheRoot, version, target });

  if (await fileExists(binaryPath)) {
    return { binaryPath, downloaded: false };
  }

  await fs.promises.mkdir(path.dirname(binaryPath), { recursive: true });
  const downloadURL = buildDownloadURL({
    version,
    target,
    env,
    configuredDownloadBaseURL,
  });
  const tempPath = `${binaryPath}.download`;

  await downloadFile(downloadURL, tempPath);

  if (platform !== "win32") {
    await fs.promises.chmod(tempPath, 0o755);
  }

  await fs.promises.rename(tempPath, binaryPath);
  return { binaryPath, downloaded: true, downloadURL };
}

async function fileExists(filePath) {
  try {
    const stat = await fs.promises.stat(filePath);
    return stat.isFile() && stat.size > 0;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function downloadFile(url, destination) {
  try {
    await downloadWithRedirects(url, destination, 0);
  } catch (error) {
    await fs.promises.rm(destination, { force: true }).catch(() => {});
    throw error;
  }
}

function downloadWithRedirects(url, destination, redirectCount) {
  if (redirectCount > 5) {
    return Promise.reject(new Error("Too many redirects while downloading fastmoss"));
  }

  return new Promise((resolve, reject) => {
    const client = url.startsWith("https://") ? https : http;
    const request = client.get(
      url,
      {
        headers: {
          "User-Agent": "fastmoss-npm-wrapper",
        },
      },
      async (response) => {
        const statusCode = response.statusCode || 0;

        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();
          try {
            await downloadWithRedirects(
              response.headers.location,
              destination,
              redirectCount + 1,
            );
            resolve();
          } catch (error) {
            reject(error);
          }
          return;
        }

        if (statusCode !== 200) {
          response.resume();
          reject(
            new Error(
              `Failed to download fastmoss binary: HTTP ${statusCode} from ${url}`,
            ),
          );
          return;
        }

        const output = fs.createWriteStream(destination, { mode: 0o755 });
        try {
          await pipeline(response, output);
          resolve();
        } catch (error) {
          reject(error);
        }
      },
    );

    request.on("error", reject);
  });
}

async function runCLI({
  version,
  args = process.argv.slice(2),
  env = process.env,
  platform = process.platform,
  arch = process.arch,
  homeDir = os.homedir(),
  stdout = process.stdout,
  stderr = process.stderr,
  configuredDownloadBaseURL = "",
} = {}) {
  const { binaryPath, downloaded, downloadURL } = await ensureBinary({
    version,
    env,
    platform,
    arch,
    homeDir,
    configuredDownloadBaseURL,
  });

  if (downloaded) {
    stderr.write(`Downloading fastmoss ${version} from ${downloadURL}\n`);
  }

  await new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, {
      stdio: ["inherit", stdout, stderr],
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`fastmoss exited with signal ${signal}`));
        return;
      }
      process.exitCode = code || 0;
      resolve();
    });
  });
}

module.exports = {
  DEFAULT_DOWNLOAD_BASE_URL,
  buildDownloadURL,
  ensureBinary,
  resolveBinaryPath,
  resolveCacheRoot,
  resolveDownloadBaseURL,
  resolvePlatformTarget,
  runCLI,
};
