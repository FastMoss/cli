#!/usr/bin/env node

const packageJSON = require("../package.json");
const { runCLI } = require("../lib/runtime");

runCLI({
  version: packageJSON.version,
  configuredDownloadBaseURL: packageJSON.fastmoss?.downloadBaseURL,
}).catch((error) => {
  process.stderr.write(`fastmoss wrapper error: ${error.message}\n`);
  process.exit(1);
});
