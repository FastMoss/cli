function npmCommand(platform = process.platform) {
  return platform === "win32" ? "npm.cmd" : "npm";
}

function spawnOptionsForCommand(command, platform = process.platform) {
  return platform === "win32" && /\.(cmd|bat)$/i.test(command) ? { shell: true } : {};
}

function verdaccioCommand(args, { execPath = process.execPath, resolve = require.resolve } = {}) {
  return {
    command: execPath,
    args: [resolve("verdaccio/bin/verdaccio"), ...args],
  };
}

module.exports = { npmCommand, spawnOptionsForCommand, verdaccioCommand };
