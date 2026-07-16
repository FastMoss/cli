const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "..");
const mainPackage = require("../fastmoss/package.json");
const { PLATFORM_TARGETS } = require("../fastmoss/lib/targets");

function run(command, args, { env = process.env, cwd = repoRoot } = {}) {
  const result = spawnSync(command, args, { cwd, env, encoding: "utf8" });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`,
  );
  return result;
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForRegistry(url, child, logs) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Verdaccio exited before startup\n${logs()}`);
    try {
      const response = await fetch(`${url}-/ping`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Verdaccio did not start within 10 seconds\n${logs()}`);
}

async function main() {
  const tempRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fastmoss-registry-"));
  let verdaccio;
  let stdout = "";
  let stderr = "";
  const logs = () => `stdout:\n${stdout}\nstderr:\n${stderr}`;
  try {
    const port = await freePort();
    const registryURL = `http://127.0.0.1:${port}/`;
    const configPath = path.join(tempRoot, "verdaccio.yaml");
    const npmrcPath = path.join(tempRoot, ".npmrc");
    const config = [
      `storage: ${JSON.stringify(path.join(tempRoot, "storage"))}`,
      "auth:",
      "  htpasswd:",
      `    file: ${JSON.stringify(path.join(tempRoot, "htpasswd"))}`,
      "    max_users: 1000",
      "uplinks: {}",
      "packages:",
      '  "@*/*":',
      "    access: $all",
      "    publish: $authenticated",
      "    unpublish: $authenticated",
      "    proxy: false",
      '  "**":',
      "    access: $all",
      "    publish: $authenticated",
      "    unpublish: $authenticated",
      "    proxy: false",
      "log:",
      "  type: stdout",
      "  format: pretty",
      "  level: warn",
      "",
    ].join("\n");
    await fs.promises.writeFile(configPath, config);

    const verdaccioBin = path.join(
      repoRoot,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "verdaccio.cmd" : "verdaccio",
    );
    verdaccio = spawn(
      verdaccioBin,
      ["--config", configPath, "--listen", `127.0.0.1:${port}`],
      { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] },
    );
    verdaccio.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    verdaccio.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    await waitForRegistry(registryURL, verdaccio, logs);
    const userResponse = await fetch(`${registryURL}-/user/org.couchdb.user:ci`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        _id: "org.couchdb.user:ci",
        name: "ci",
        password: "ci-password",
        email: "ci@example.com",
        type: "user",
        roles: [],
      }),
    });
    if (userResponse.status !== 201) {
      assert.equal(userResponse.status, 201, await userResponse.text());
    }
    const { token } = await userResponse.json();
    const registryHost = registryURL.replace(/^https?:/, "");
    await fs.promises.writeFile(
      npmrcPath,
      [
        `registry=${registryURL}`,
        `@fastmoss:registry=${registryURL}`,
        `${registryHost}:_authToken=${token}`,
        "always-auth=true",
        "",
      ].join("\n"),
    );

    const isolatedEnv = {
      ...process.env,
      NPM_CONFIG_USERCONFIG: npmrcPath,
      npm_config_registry: registryURL,
      HTTP_PROXY: "http://127.0.0.1:9",
      HTTPS_PROXY: "http://127.0.0.1:9",
      http_proxy: "http://127.0.0.1:9",
      https_proxy: "http://127.0.0.1:9",
      ALL_PROXY: "http://127.0.0.1:9",
      all_proxy: "http://127.0.0.1:9",
      NO_PROXY: "127.0.0.1,localhost",
      no_proxy: "127.0.0.1,localhost",
    };

    for (const target of Object.values(PLATFORM_TARGETS)) {
      run(
        "npm",
        [
          "publish",
          path.join(repoRoot, "platform-packages", target.packageDir),
          "--access",
          "public",
        ],
        { env: isolatedEnv },
      );
    }
    run("npm", ["publish", path.join(repoRoot, "fastmoss"), "--access", "public"], {
      env: isolatedEnv,
    });
    run(
      "npm",
      ["publish", path.join(repoRoot, "fastmoss-skill"), "--access", "public"],
      { env: isolatedEnv },
    );

    const cliHome = path.join(tempRoot, "cli-home");
    const cliPrefix = path.join(tempRoot, "cli-prefix");
    await fs.promises.mkdir(cliHome, { recursive: true });
    await fs.promises.mkdir(cliPrefix, { recursive: true });
    run("npm", ["install", "-g", "@fastmoss/cli@latest"], {
      env: {
        ...isolatedEnv,
        HOME: cliHome,
        USERPROFILE: cliHome,
        npm_config_prefix: cliPrefix,
      },
    });
    const fastmossCommand =
      process.platform === "win32"
        ? path.join(cliPrefix, "fastmoss.cmd")
        : path.join(cliPrefix, "bin", "fastmoss");
    const versionResult = run(fastmossCommand, ["--version"], { env: isolatedEnv });
    assert.equal(versionResult.stdout.trim(), mainPackage.version);
    const helpResult = run(fastmossCommand, ["help"], { env: isolatedEnv });
    assert.match(helpResult.stdout, /fastmoss|Usage|Commands/i);
    for (const directory of [".codex", ".claude", ".agents"]) {
      assert.equal(fs.existsSync(path.join(cliHome, directory, "skills")), false);
    }

    const skillHome = path.join(tempRoot, "skill-home");
    const skillPrefix = path.join(tempRoot, "skill-prefix");
    await fs.promises.mkdir(skillHome, { recursive: true });
    await fs.promises.mkdir(path.join(skillPrefix, "lib"), { recursive: true });
    const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
    const skillResult = run(npxCommand, ["-y", "@fastmoss/skill@latest"], {
      env: {
        ...isolatedEnv,
        HOME: skillHome,
        USERPROFILE: skillHome,
        npm_config_prefix: skillPrefix,
      },
    });
    for (const directory of [".codex", ".claude", ".agents"]) {
      assert.equal(
        fs.existsSync(path.join(skillHome, directory, "skills", "fastmoss-cli", "SKILL.md")),
        true,
      );
    }
    assert.match(skillResult.stdout, /Agent action: Read/);
    const unexpectedCLI =
      process.platform === "win32"
        ? path.join(skillPrefix, "fastmoss.cmd")
        : path.join(skillPrefix, "bin", "fastmoss");
    assert.equal(fs.existsSync(unexpectedCLI), false);
  } catch (error) {
    error.message = `${error.message}\n${logs()}`;
    throw error;
  } finally {
    if (verdaccio) {
      verdaccio.kill("SIGTERM");
      await new Promise((resolve) => verdaccio.once("exit", resolve));
    }
    await fs.promises.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
