#!/usr/bin/env node

const packageJSON = require("../package.json");
const { installCLI } = require("../lib/runtime");

installCLI({
  version: packageJSON.version,
  configuredDownloadBaseURL: packageJSON.fastmoss?.downloadBaseURL,
}).catch((error) => {
  process.stderr.write(`fastmoss postinstall warning: ${error.message}\n`);
  process.stderr.write("The binary will be downloaded on first run.\n");
});
