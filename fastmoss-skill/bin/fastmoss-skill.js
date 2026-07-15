#!/usr/bin/env node

const path = require("node:path");
const packageJSON = require("../package.json");
const { installSkill, parseArgs, uninstallSkill } = require("../lib/installer");

const USAGE = `Usage: fastmoss-skill [install|uninstall] [--agent codex|claude|agents|all]

Environment:
  FASTMOSS_SKILL_DIR  Override the destination skills root.
`;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(USAGE);
    return;
  }
  if (options.version) {
    process.stdout.write(`${packageJSON.version}\n`);
    return;
  }
  if (options.action === "uninstall") {
    await uninstallSkill({ agent: options.agent });
    return;
  }
  await installSkill({
    agent: options.agent,
    sourceSkillDir: path.join(__dirname, "..", "skills", "fastmoss-cli"),
    version: packageJSON.version,
  });
}

main().catch((error) => {
  process.stderr.write(`fastmoss-skill error: ${error.message}\n`);
  process.exitCode = 1;
});
