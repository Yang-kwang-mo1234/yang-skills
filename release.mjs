// Prepare a release of yang-skills or yang-claude: bump VERSION and add a CHANGELOG.md section.
// It does not commit, tag or push; it prints those commands so each one goes through
// the usual Allow / Deny prompt. macOS, Linux, Windows. Needs Node 18+ and git.
//
//   node release.mjs <patch|minor|major|X.Y.Z> [repo dir]   repo dir defaults to this repo
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [bump, dirArg] = process.argv.slice(2);
const repo = resolve(dirArg || dirname(fileURLToPath(import.meta.url)));
const git = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const fail = (msg) => {
  console.error(`error  ${msg}`);
  process.exit(1);
};

if (!bump) fail("usage: node release.mjs <patch|minor|major|X.Y.Z> [repo dir]");
if (git("status", "--porcelain")) fail(`${repo} has uncommitted changes; commit them first`);
const branch = git("rev-parse", "--abbrev-ref", "HEAD");
if (branch !== "main") fail(`${repo} is on ${branch}; releases are made from main`);

const versionFile = join(repo, "VERSION");
const current = existsSync(versionFile) ? readFileSync(versionFile, "utf8").trim() : "0.0.0";
const m = current.match(/^(\d+)\.(\d+)\.(\d+)$/);
if (!m) fail(`VERSION is "${current}", expected X.Y.Z`);
const [maj, min, pat] = m.slice(1).map(Number);
const next =
  bump === "major" ? `${maj + 1}.0.0`
  : bump === "minor" ? `${maj}.${min + 1}.0`
  : bump === "patch" ? `${maj}.${min}.${pat + 1}`
  : /^\d+\.\d+\.\d+$/.test(bump) ? bump
  : fail(`unknown bump "${bump}"`);
const tag = `v${next}`;
if (git("tag", "--list", tag)) fail(`tag ${tag} already exists`);

// Commits since the last release tag, or all of them for the first release.
const last = git("tag", "--list", "v*", "--sort=-v:refname").split("\n")[0];
const subjects = git("log", "--no-merges", "--format=%s", ...(last ? [`${last}..HEAD`] : ["HEAD"]))
  .split("\n")
  .filter(Boolean);
if (last && !subjects.length) fail(`no commits since ${last}`);

const date = new Date().toISOString().slice(0, 10);
const section = `## ${tag} - ${date}\n\n${subjects.map((s) => `- ${s}`).join("\n")}\n`;
const changelog = join(repo, "CHANGELOG.md");
const old = existsSync(changelog) ? readFileSync(changelog, "utf8") : "# Changelog\n";
// The new section goes right after the title, above older releases.
const at = old.indexOf("\n## ");
const updated = at === -1 ? `${old.trimEnd()}\n\n${section}` : `${old.slice(0, at)}\n${section}${old.slice(at)}`;

writeFileSync(versionFile, next + "\n");
writeFileSync(changelog, updated);

console.log(`release ${tag} prepared in ${repo} (${last || "first release"} -> ${tag})`);
console.log("Edit CHANGELOG.md if needed, then run each of these:");
console.log(`  git -C ${repo} add VERSION CHANGELOG.md`);
console.log(`  git -C ${repo} commit -m "Release ${tag}"`);
console.log(`  git -C ${repo} tag -a ${tag} -m ${tag}`);
console.log(`  git -C ${repo} push origin main ${tag}`);
