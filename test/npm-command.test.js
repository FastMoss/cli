const assert = require("node:assert/strict");
const test = require("node:test");

const { npmCommand, spawnOptionsForCommand } = require("../scripts/npm-command");

test("npm command uses the Windows command shim", () => {
  assert.equal(npmCommand("win32"), "npm.cmd");
  assert.equal(npmCommand("darwin"), "npm");
  assert.equal(npmCommand("linux"), "npm");
});

test("Windows command shims run through the shell", () => {
  assert.deepEqual(spawnOptionsForCommand("npm.cmd", "win32"), { shell: true });
  assert.deepEqual(spawnOptionsForCommand("npx.cmd", "win32"), { shell: true });
  assert.deepEqual(spawnOptionsForCommand("fastmoss.cmd", "win32"), { shell: true });
  assert.deepEqual(spawnOptionsForCommand("npm", "win32"), {});
  assert.deepEqual(spawnOptionsForCommand("npm.cmd", "darwin"), {});
});
