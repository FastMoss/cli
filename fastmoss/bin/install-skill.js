#!/usr/bin/env node

const path = require("node:path");
const {
  INSTALL_SKILL_USAGE,
  installSkill,
  parseInstallSkillArgs,
} = require("../lib/runtime");

async function main() {
  let options;
  try {
    options = parseInstallSkillArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${INSTALL_SKILL_USAGE}`);
    process.exitCode = 1;
    return;
  }

  if (options.help) {
    process.stdout.write(INSTALL_SKILL_USAGE);
    return;
  }

  await installSkill({
    packageRoot: path.join(__dirname, ".."),
    agent: options.agent,
  });
}

main().catch((error) => {
  process.stderr.write(`fastmoss-install-skill error: ${error.message}\n`);
  process.exitCode = 1;
});
