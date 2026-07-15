#!/usr/bin/env node

const packageJSON = require("../package.json");
const { runCLI } = require("../lib/runtime");

runCLI({ version: packageJSON.version })
  .then(({ code, signal }) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exitCode = code == null ? 1 : code;
  })
  .catch((error) => {
    process.stderr.write(`fastmoss wrapper error: ${error.message}\n`);
    process.exitCode = 1;
  });
