const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const {
  INSTALL_MANIFEST,
  installSkill,
  parseArgs,
  resolveSkillRoots,
  uninstallSkill,
} = require("../lib/installer");

async function fixture() {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fastmoss-skill-"));
  const source = path.join(root, "payload", "fastmoss-cli");
  await fs.promises.mkdir(path.join(source, "references"), { recursive: true });
  await fs.promises.writeFile(path.join(source, "SKILL.md"), "# FastMoss\n");
  await fs.promises.writeFile(path.join(source, "references", "cli.md"), "# CLI\n");
  return { root, source };
}

test("empty args mean non-interactive install for all agents", () => {
  assert.deepEqual(parseArgs([]), {
    action: "install",
    agent: "all",
    help: false,
    version: false,
  });
  assert.equal(parseArgs(["uninstall", "--agent", "codex"]).action, "uninstall");
  assert.throws(() => parseArgs(["--agent", "unknown"]), /Unsupported agent/);
  assert.throws(() => parseArgs(["--agent"]), /requires a value/);
});

test("default roots include Codex, Claude, and Agents even when absent", () => {
  const homeDir = path.resolve("demo-home");
  assert.deepEqual(resolveSkillRoots({ agent: "all", env: {}, homeDir }), [
    path.join(homeDir, ".codex", "skills"),
    path.join(homeDir, ".claude", "skills"),
    path.join(homeDir, ".agents", "skills"),
  ]);
});

test("FASTMOSS_SKILL_DIR is the only destination when set", () => {
  assert.deepEqual(
    resolveSkillRoots({
      agent: "codex",
      env: { FASTMOSS_SKILL_DIR: "/tmp/custom-skills" },
      homeDir: "/tmp/home",
    }),
    [path.resolve("/tmp/custom-skills")],
  );
});

test("three HOME variables pointing to one directory are deduplicated", () => {
  const shared = path.resolve("shared-home");
  assert.deepEqual(
    resolveSkillRoots({
      agent: "all",
      env: {
        CODEX_HOME: shared,
        CLAUDE_HOME: shared,
        AGENTS_HOME: shared,
      },
      homeDir: "/tmp/home",
    }),
    [path.join(shared, "skills")],
  );
});

test("install replaces a legacy directory and writes ownership metadata", async () => {
  const { root, source } = await fixture();
  const skillRoot = path.join(root, "skills");
  const target = path.join(skillRoot, "fastmoss-cli");
  let output = "";
  try {
    await fs.promises.mkdir(target, { recursive: true });
    await fs.promises.writeFile(path.join(target, "legacy.txt"), "legacy\n");
    const result = await installSkill({
      sourceSkillDir: source,
      version: "1.2.3",
      env: { FASTMOSS_SKILL_DIR: skillRoot },
      homeDir: root,
      stdout: {
        write(chunk) {
          output += chunk;
        },
      },
      uniqueId: () => "test",
    });
    assert.deepEqual(result.installed, [target]);
    assert.equal(fs.existsSync(path.join(target, "legacy.txt")), false);
    const manifest = JSON.parse(
      await fs.promises.readFile(path.join(target, INSTALL_MANIFEST), "utf8"),
    );
    assert.deepEqual(
      {
        package: manifest.package,
        skill: manifest.skill,
        version: manifest.version,
      },
      { package: "@fastmoss/skill", skill: "fastmoss-cli", version: "1.2.3" },
    );
    assert.match(
      output,
      new RegExp(path.join(target, "SKILL.md").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
    assert.match(output, /Agent action: Read/);
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("payload missing SKILL.md writes no targets", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fastmoss-skill-"));
  const source = path.join(root, "payload", "fastmoss-cli");
  const skillRoot = path.join(root, "skills");
  try {
    await fs.promises.mkdir(source, { recursive: true });
    await assert.rejects(
      installSkill({
        sourceSkillDir: source,
        version: "1.2.3",
        env: { FASTMOSS_SKILL_DIR: skillRoot },
      }),
      /missing SKILL\.md/,
    );
    assert.equal(fs.existsSync(skillRoot), false);
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("failed final rename restores the previous directory", async () => {
  const { root, source } = await fixture();
  const skillRoot = path.join(root, "skills");
  const target = path.join(skillRoot, "fastmoss-cli");
  try {
    await fs.promises.mkdir(target, { recursive: true });
    await fs.promises.writeFile(path.join(target, "SKILL.md"), "old\n");
    const injected = {
      ...fs.promises,
      async rename(from, to) {
        if (from.endsWith(".tmp-test") && to === target) {
          const error = new Error("injected rename failure");
          error.code = "EACCES";
          throw error;
        }
        return fs.promises.rename(from, to);
      },
    };
    await assert.rejects(
      installSkill({
        sourceSkillDir: source,
        version: "1.2.3",
        env: { FASTMOSS_SKILL_DIR: skillRoot },
        fsPromises: injected,
        uniqueId: () => "test",
      }),
      /injected rename failure/,
    );
    assert.equal(
      await fs.promises.readFile(path.join(target, "SKILL.md"), "utf8"),
      "old\n",
    );
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("multi-root install rolls back earlier replacements when a later root fails", async () => {
  const { root, source } = await fixture();
  const codexHome = path.join(root, "codex-home");
  const claudeHome = path.join(root, "claude-home");
  const agentsHome = path.join(root, "agents-home");
  const codexTarget = path.join(codexHome, "skills", "fastmoss-cli");
  const claudeTarget = path.join(claudeHome, "skills", "fastmoss-cli");
  const agentsTarget = path.join(agentsHome, "skills", "fastmoss-cli");
  try {
    await fs.promises.mkdir(codexTarget, { recursive: true });
    await fs.promises.writeFile(path.join(codexTarget, "SKILL.md"), "codex-old\n");
    await fs.promises.mkdir(claudeTarget, { recursive: true });
    await fs.promises.writeFile(path.join(claudeTarget, "SKILL.md"), "claude-old\n");
    const injected = {
      ...fs.promises,
      async rename(from, to) {
        if (from.endsWith(".tmp-test") && to === claudeTarget) {
          const error = new Error("injected second-root failure");
          error.code = "EACCES";
          throw error;
        }
        return fs.promises.rename(from, to);
      },
    };
    await assert.rejects(
      installSkill({
        sourceSkillDir: source,
        version: "1.2.3",
        env: {
          CODEX_HOME: codexHome,
          CLAUDE_HOME: claudeHome,
          AGENTS_HOME: agentsHome,
        },
        fsPromises: injected,
        uniqueId: () => "test",
      }),
      /injected second-root failure/,
    );
    assert.equal(
      await fs.promises.readFile(path.join(codexTarget, "SKILL.md"), "utf8"),
      "codex-old\n",
    );
    assert.equal(
      await fs.promises.readFile(path.join(claudeTarget, "SKILL.md"), "utf8"),
      "claude-old\n",
    );
    assert.equal(fs.existsSync(agentsTarget), false);
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("permission errors include the failed target path and never suggest sudo", async () => {
  const { root, source } = await fixture();
  const skillRoot = path.join(root, "skills");
  const target = path.join(skillRoot, "fastmoss-cli");
  const injected = {
    ...fs.promises,
    async cp() {
      const error = new Error("permission denied");
      error.code = "EACCES";
      throw error;
    },
  };
  try {
    await assert.rejects(
      installSkill({
        sourceSkillDir: source,
        version: "1.2.3",
        env: { FASTMOSS_SKILL_DIR: skillRoot },
        fsPromises: injected,
        uniqueId: () => "test",
      }),
      (error) => {
        assert.match(error.message, /permission denied/);
        assert.match(error.message, new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
        assert.equal(error.message.includes("sudo"), false);
        return true;
      },
    );
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("uninstall removes only a valid FastMoss-managed directory", async () => {
  const { root, source } = await fixture();
  const managedRoot = path.join(root, "managed");
  const unmanagedRoot = path.join(root, "unmanaged");
  try {
    await installSkill({
      sourceSkillDir: source,
      version: "1.2.3",
      env: { FASTMOSS_SKILL_DIR: managedRoot },
    });
    await fs.promises.mkdir(path.join(unmanagedRoot, "fastmoss-cli"), {
      recursive: true,
    });
    await uninstallSkill({ env: { FASTMOSS_SKILL_DIR: managedRoot } });
    await uninstallSkill({ env: { FASTMOSS_SKILL_DIR: unmanagedRoot } });
    assert.equal(fs.existsSync(path.join(managedRoot, "fastmoss-cli")), false);
    assert.equal(fs.existsSync(path.join(unmanagedRoot, "fastmoss-cli")), true);
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("invalid JSON manifest is treated as unmanaged", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fastmoss-skill-"));
  const skillRoot = path.join(root, "skills");
  const target = path.join(skillRoot, "fastmoss-cli");
  try {
    await fs.promises.mkdir(target, { recursive: true });
    await fs.promises.writeFile(path.join(target, INSTALL_MANIFEST), "{broken");
    await uninstallSkill({ env: { FASTMOSS_SKILL_DIR: skillRoot } });
    assert.equal(fs.existsSync(target), true);
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("--help and --version do not write to user directories", async () => {
  const tempHome = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fastmoss-skill-home-"));
  const packageRoot = path.join(__dirname, "..");
  const tempPackageRoot = path.join(tempHome, "package");
  try {
    await fs.promises.cp(path.join(packageRoot, "bin"), path.join(tempPackageRoot, "bin"), {
      recursive: true,
    });
    await fs.promises.cp(path.join(packageRoot, "lib"), path.join(tempPackageRoot, "lib"), {
      recursive: true,
    });
    await fs.promises.writeFile(
      path.join(tempPackageRoot, "package.json"),
      `${JSON.stringify({ version: "1.2.3" })}\n`,
    );
    for (const arg of ["--help", "--version"]) {
      const result = spawnSync(
        process.execPath,
        [path.join(tempPackageRoot, "bin", "fastmoss-skill.js"), arg],
        {
          env: { ...process.env, HOME: tempHome },
          encoding: "utf8",
        },
      );
      assert.equal(result.status, 0, result.stderr);
    }
    assert.equal(fs.existsSync(path.join(tempHome, ".codex")), false);
    assert.equal(fs.existsSync(path.join(tempHome, ".claude")), false);
    assert.equal(fs.existsSync(path.join(tempHome, ".agents")), false);
  } finally {
    await fs.promises.rm(tempHome, { recursive: true, force: true });
  }
});
