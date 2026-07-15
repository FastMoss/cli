const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const SKILL_NAME = "fastmoss-cli";
const PACKAGE_NAME = "@fastmoss/skill";
const INSTALL_MANIFEST = ".fastmoss-install.json";
const AGENTS = new Set(["codex", "claude", "agents", "all"]);

function parseArgs(args = []) {
  const result = {
    action: "install",
    agent: "all",
    help: false,
    version: false,
  };
  let actionSeen = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "install" || arg === "uninstall") {
      if (actionSeen) throw new Error("Only one action may be specified");
      result.action = arg;
      actionSeen = true;
    } else if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--version" || arg === "-v") {
      result.version = true;
    } else if (arg === "--agent" || arg === "-a") {
      const value = String(args[index + 1] || "").toLowerCase();
      if (!value) throw new Error(`${arg} requires a value`);
      if (!AGENTS.has(value)) throw new Error(`Unsupported agent: ${value}`);
      result.agent = value;
      index += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return result;
}

function resolveSkillRoots({
  agent = "all",
  env = process.env,
  homeDir = os.homedir(),
} = {}) {
  const override = String(env.FASTMOSS_SKILL_DIR || "").trim();
  if (override) return [path.resolve(override)];
  if (!AGENTS.has(agent)) throw new Error(`Unsupported agent: ${agent}`);
  const roots = {
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
  const selected = agent === "all" ? Object.values(roots) : [roots[agent]];
  return [...new Set(selected.map((root) => path.resolve(root)))];
}

async function exists(filePath, fsPromises = fs.promises) {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") return false;
    throw error;
  }
}

async function prepareInstall({
  sourceSkillDir,
  targetRoot,
  version,
  fsPromises,
  uniqueId,
}) {
  const target = path.join(targetRoot, SKILL_NAME);
  const id = uniqueId();
  const temporary = `${target}.tmp-${id}`;
  const backup = `${target}.backup-${id}`;
  const state = {
    target,
    temporary,
    backup,
    hadTarget: false,
    swapped: false,
  };
  await fsPromises.mkdir(targetRoot, { recursive: true });
  await fsPromises.rm(temporary, { recursive: true, force: true });
  await fsPromises.rm(backup, { recursive: true, force: true });
  await fsPromises.cp(sourceSkillDir, temporary, {
    recursive: true,
    filter(source) {
      return path.basename(source) !== ".DS_Store";
    },
  });
  if (!(await exists(path.join(temporary, "SKILL.md"), fsPromises))) {
    throw new Error(
      `FastMoss Skill payload is missing SKILL.md: ${sourceSkillDir}`,
    );
  }
  await fsPromises.writeFile(
    path.join(temporary, INSTALL_MANIFEST),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        package: PACKAGE_NAME,
        skill: SKILL_NAME,
        version,
        installedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  state.hadTarget = await exists(target, fsPromises);
  return state;
}

async function swapPreparedInstall(state, fsPromises) {
  if (state.hadTarget) await fsPromises.rename(state.target, state.backup);
  try {
    await fsPromises.rename(state.temporary, state.target);
    state.swapped = true;
  } catch (error) {
    if (state.hadTarget && (await exists(state.backup, fsPromises))) {
      await fsPromises.rename(state.backup, state.target);
    }
    throw error;
  }
}

async function rollbackPreparedInstalls(states, fsPromises) {
  for (const state of states.slice().reverse()) {
    await fsPromises.rm(state.temporary, { recursive: true, force: true });
    if (!state.swapped) continue;
    await fsPromises.rm(state.target, { recursive: true, force: true });
    if (state.hadTarget && (await exists(state.backup, fsPromises))) {
      await fsPromises.rename(state.backup, state.target);
    }
  }
}

async function cleanupPreparedInstalls(states, fsPromises) {
  for (const state of states) {
    await fsPromises.rm(state.temporary, { recursive: true, force: true });
    await fsPromises.rm(state.backup, { recursive: true, force: true });
  }
}

async function installOne(options) {
  let state;
  try {
    state = await prepareInstall(options);
    await swapPreparedInstall(state, options.fsPromises);
    await cleanupPreparedInstalls([state], options.fsPromises);
    return state.target;
  } catch (error) {
    if (state) await rollbackPreparedInstalls([state], options.fsPromises);
    const target =
      state?.target || path.join(options.targetRoot || "", SKILL_NAME);
    error.message = `${error.message}\nTarget: ${target}`;
    throw error;
  }
}

async function installSkill({
  sourceSkillDir,
  version,
  agent = "all",
  env = process.env,
  homeDir = os.homedir(),
  stdout = process.stdout,
  fsPromises = fs.promises,
  uniqueId = () => `${process.pid}-${Date.now()}`,
} = {}) {
  if (!(await exists(path.join(sourceSkillDir, "SKILL.md"), fsPromises))) {
    throw new Error(`FastMoss Skill payload is missing SKILL.md: ${sourceSkillDir}`);
  }
  const targetRoots = resolveSkillRoots({ agent, env, homeDir });
  if (targetRoots.length === 1) {
    const installed = [
      await installOne({
        sourceSkillDir,
        targetRoot: targetRoots[0],
        version,
        fsPromises,
        uniqueId,
      }),
    ];
    for (const target of installed) {
      stdout.write(`Installed FastMoss Skill: ${path.join(target, "SKILL.md")}\n`);
    }
    stdout.write(
      "Agent action: Read the installed fastmoss-cli/SKILL.md now and use it in this conversation.\n",
    );
    stdout.write(
      "If this client cannot load newly installed skills in the current session, start a new conversation.\n",
    );
    return { installed };
  }

  const states = [];
  try {
    for (const targetRoot of targetRoots) {
      states.push(
        await prepareInstall({
          sourceSkillDir,
          targetRoot,
          version,
          fsPromises,
          uniqueId,
        }),
      );
    }
    for (const state of states) {
      await swapPreparedInstall(state, fsPromises);
    }
    await cleanupPreparedInstalls(states, fsPromises);
  } catch (error) {
    await rollbackPreparedInstalls(states, fsPromises);
    const target = states.find((state) => !state.swapped)?.target || states.at(-1)?.target;
    error.message = `${error.message}\nTarget: ${target || SKILL_NAME}`;
    throw error;
  }

  const installed = states.map((state) => state.target);
  for (const target of installed) {
    stdout.write(`Installed FastMoss Skill: ${path.join(target, "SKILL.md")}\n`);
  }
  stdout.write(
    "Agent action: Read the installed fastmoss-cli/SKILL.md now and use it in this conversation.\n",
  );
  stdout.write(
    "If this client cannot load newly installed skills in the current session, start a new conversation.\n",
  );
  return { installed };
}

async function readOwnedManifest(manifestPath, fsPromises) {
  try {
    const manifest = JSON.parse(await fsPromises.readFile(manifestPath, "utf8"));
    return manifest.package === PACKAGE_NAME && manifest.skill === SKILL_NAME;
  } catch {
    return false;
  }
}

async function uninstallSkill({
  agent = "all",
  env = process.env,
  homeDir = os.homedir(),
  stdout = process.stdout,
  fsPromises = fs.promises,
} = {}) {
  const removed = [];
  for (const targetRoot of resolveSkillRoots({ agent, env, homeDir })) {
    const target = path.join(targetRoot, SKILL_NAME);
    const owned = await readOwnedManifest(
      path.join(target, INSTALL_MANIFEST),
      fsPromises,
    );
    if (!owned) {
      stdout.write(`Skipped unmanaged or missing FastMoss Skill: ${target}\n`);
      continue;
    }
    await fsPromises.rm(target, { recursive: true, force: true });
    removed.push(target);
    stdout.write(`Removed FastMoss Skill: ${target}\n`);
  }
  return { removed };
}

module.exports = {
  INSTALL_MANIFEST,
  PACKAGE_NAME,
  SKILL_NAME,
  installSkill,
  parseArgs,
  resolveSkillRoots,
  uninstallSkill,
};
