function npmCommand(platform = process.platform) {
  return platform === "win32" ? "npm.cmd" : "npm";
}

function spawnOptionsForCommand(command, platform = process.platform) {
  return platform === "win32" && /\.(cmd|bat)$/i.test(command) ? { shell: true } : {};
}

module.exports = { npmCommand, spawnOptionsForCommand };
