const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

const workflowPath = path.join(__dirname, "..", ".github", "workflows", "release.yml");

test("release workflow is valid YAML", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  assert.doesNotThrow(() => yaml.load(workflow));
});

test("release workflow validates all operating systems before publishing", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  for (const required of [
    "ubuntu-latest",
    "macos-latest",
    "windows-latest",
    "npm ci",
    "npm test",
    "npm run test:integration",
    "test/install-powershell.ps1",
  ]) {
    assert.match(workflow, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("release build creates npm tarballs and GitHub archives once", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const buildJob = workflow.slice(
    workflow.indexOf("  build-release:"),
    workflow.indexOf("  publish-npm:"),
  );
  assert.match(buildJob, /npm run pack:release/);
  assert.match(buildJob, /npm run archive:release/);
});

test("npm publish consumes the ordered seven-package manifest", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  assert.match(workflow, /manifest\.json/);
  assert.match(workflow, /entry\.kind/);
  assert.match(workflow, /npm["']?,\s*\["publish"/);
  assert.match(workflow, /NODE_AUTH_TOKEN/);
});

test("npm and GitHub publish jobs share build output without depending on each other", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const npmJob = workflow.slice(
    workflow.indexOf("  publish-npm:"),
    workflow.indexOf("  publish-github:"),
  );
  const githubJob = workflow.slice(workflow.indexOf("  publish-github:"));
  assert.match(npmJob, /needs: build-release/);
  assert.match(githubJob, /needs: build-release/);
  assert.doesNotMatch(npmJob, /needs: publish-github/);
  assert.doesNotMatch(githubJob, /needs: publish-npm/);
  assert.match(githubJob, /release-assets\/\*/);
  assert.match(githubJob, /dist\/publish\/github\/\*/);
});
