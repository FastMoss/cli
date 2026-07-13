const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const https = require("node:https");
const { pipeline } = require("node:stream/promises");
const { spawn } = require("node:child_process");

const DEFAULT_DOWNLOAD_BASE_URL =
  "https://github.com/FastMoss/cli/releases/download";
const SKILL_NAME = "fastmoss-cli";
const INSTALL_SKILL_USAGE = `Usage: fastmoss-install-skill [--agent codex|claude|agents|all]

Options:
  -a, --agent <agent>   Install for a specific agent client.
                         Supported: codex, claude, agents, all.
  -h, --help            Show this help message.

Environment:
  FASTMOSS_SKILL_AGENT          Default agent for this command.
  FASTMOSS_SKILL_DIR            Override the target skills directory.
  FASTMOSS_SKIP_SKILL_INSTALL   Skip skill installation.
`;

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
  onDownloadStart = () => {},
  downloadFileFn = downloadFile,
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

  onDownloadStart(downloadURL);
  await downloadFileFn(downloadURL, tempPath);

  if (platform !== "win32") {
    await fs.promises.chmod(tempPath, 0o755);
  }

  await fs.promises.rename(tempPath, binaryPath);
  return { binaryPath, downloaded: true, downloadURL };
}

function shouldSkipDownload(env = process.env) {
  const value = String(env.FASTMOSS_SKIP_DOWNLOAD || "").trim().toLowerCase();
  return value !== "" && value !== "0" && value !== "false";
}

function isTruthyEnv(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized !== "" && normalized !== "0" && normalized !== "false";
}

function shouldSkipSkillInstall(env = process.env) {
  return isTruthyEnv(env.FASTMOSS_SKIP_SKILL_INSTALL);
}

function normalizeSkillAgent(agent = "") {
  const normalized = String(agent || "").trim().toLowerCase();
  if (normalized === "" || normalized === "auto") {
    return "auto";
  }
  if (normalized === "claude-code") {
    return "claude";
  }
  if (normalized === "agent") {
    return "agents";
  }
  return normalized;
}

function knownSkillTargets({ env = process.env, homeDir = os.homedir() } = {}) {
  return {
    codex: path.join(env.CODEX_HOME || path.join(homeDir, ".codex"), "skills"),
    claude: path.join(
      env.CLAUDE_HOME || path.join(homeDir, ".claude"),
      "skills",
    ),
    agents: path.join(
      env.AGENTS_HOME || path.join(homeDir, ".agents"),
      "skills",
    ),
  };
}

function resolveSkillInstallTargets({
  agent = "auto",
  env = process.env,
  homeDir = os.homedir(),
} = {}) {
  const override = String(env.FASTMOSS_SKILL_DIR || "").trim();
  if (override !== "") {
    return [override];
  }

  const targets = knownSkillTargets({ env, homeDir });
  const normalizedAgent = normalizeSkillAgent(agent || env.FASTMOSS_SKILL_AGENT);

  if (normalizedAgent === "all") {
    return [targets.codex, targets.claude, targets.agents];
  }
  if (normalizedAgent === "auto") {
    return Object.values(targets);
  }
  if (targets[normalizedAgent]) {
    return [targets[normalizedAgent]];
  }

  throw new Error(
    `Unsupported FastMoss skill agent: ${agent}. Supported agents: codex, claude, agents, all`,
  );
}

function parseInstallSkillArgs(args = []) {
  const result = {
    agent: "",
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      result.help = true;
      continue;
    }
    if (arg === "--agent" || arg === "-a") {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) {
        throw new Error(`${arg} requires an agent value`);
      }
      result.agent = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return result;
}

async function installSkill({
  packageRoot = path.join(__dirname, ".."),
  agent = "",
  env = process.env,
  homeDir = os.homedir(),
  stderr = process.stderr,
} = {}) {
  if (shouldSkipSkillInstall(env)) {
    stderr.write(
      "Skipping FastMoss CLI skill installation because FASTMOSS_SKIP_SKILL_INSTALL is set.\n",
    );
    return { installed: [], skipped: true };
  }

  const sourceSkillDir = path.join(packageRoot, "skills", SKILL_NAME);
  if (!(await directoryExists(sourceSkillDir))) {
    throw new Error(`FastMoss CLI skill not found: ${sourceSkillDir}`);
  }

  let targetRoots = resolveSkillInstallTargets({
    agent: agent || env.FASTMOSS_SKILL_AGENT || "auto",
    env,
    homeDir,
  });

  const isAuto =
    String(env.FASTMOSS_SKILL_DIR || "").trim() === "" &&
    normalizeSkillAgent(agent || env.FASTMOSS_SKILL_AGENT) === "auto";
  if (isAuto) {
    const existingRoots = [];
    for (const targetRoot of targetRoots) {
      if (await directoryExists(targetRoot)) {
        existingRoots.push(targetRoot);
      }
    }
    targetRoots = existingRoots;
  }

  if (targetRoots.length === 0) {
    stderr.write(
      "Skipping FastMoss CLI skill installation because no supported agent skill directory was found. Set FASTMOSS_SKILL_AGENT=codex or FASTMOSS_SKILL_DIR to install explicitly.\n",
    );
    return { installed: [], skipped: true };
  }

  const installed = [];
  for (const targetRoot of targetRoots) {
    const targetSkillDir = path.join(targetRoot, SKILL_NAME);
    await fs.promises.mkdir(targetRoot, { recursive: true });
    await fs.promises.rm(targetSkillDir, { recursive: true, force: true });
    await fs.promises.cp(sourceSkillDir, targetSkillDir, { recursive: true });
    installed.push(targetSkillDir);
    stderr.write(`Installed FastMoss CLI skill to ${targetSkillDir}\n`);
  }

  return { installed, skipped: false };
}

async function installCLI({
  version,
  env = process.env,
  platform = process.platform,
  arch = process.arch,
  homeDir = os.homedir(),
  stderr = process.stderr,
  configuredDownloadBaseURL = "",
} = {}) {
  if (shouldSkipDownload(env)) {
    stderr.write(
      "Skipping fastmoss binary download because FASTMOSS_SKIP_DOWNLOAD is set.\n",
    );
    return { skipped: true };
  }

  return ensureBinary({
    version,
    env,
    platform,
    arch,
    homeDir,
    configuredDownloadBaseURL,
    onDownloadStart(downloadURL) {
      stderr.write(`Downloading fastmoss ${version} from ${downloadURL}\n`);
    },
  });
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

async function directoryExists(directoryPath) {
  try {
    const stat = await fs.promises.stat(directoryPath);
    return stat.isDirectory();
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
  if (
    args.length === 1 &&
    ["--version", "-v", "version"].includes(args[0])
  ) {
    stdout.write(`${version}\n`);
    return;
  }

  const { binaryPath, downloaded, downloadURL } = await ensureBinary({
    version,
    env,
    platform,
    arch,
    homeDir,
    configuredDownloadBaseURL,
    onDownloadStart(downloadURL) {
      stderr.write(`Downloading fastmoss ${version} from ${downloadURL}\n`);
    },
  });

  if (downloaded) {
    stderr.write(`Downloaded fastmoss ${version} to ${binaryPath}\n`);
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
  INSTALL_SKILL_USAGE,
  buildDownloadURL,
  ensureBinary,
  installSkill,
  installCLI,
  parseInstallSkillArgs,
  resolveBinaryPath,
  resolveCacheRoot,
  resolveDownloadBaseURL,
  resolveSkillInstallTargets,
  resolvePlatformTarget,
  runCLI,
};
