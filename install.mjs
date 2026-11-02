// Install the skills and agents in this repo into ~/.claude (or $CLAUDE_CONFIG_DIR).
// macOS, Linux, Windows. Needs only Node 18+.
//
//   node install.mjs            install or update everything
//   node install.mjs <name...>  only these skills (agents are always installed)
//   node install.mjs --dry-run  show what would change
//
// Files in the repo overwrite the installed copies. Files listed in KEEP are local state
// that the skill itself updates, so they are copied only when missing.
//
// A full install (no names, no --dry-run) records the repo commit in
// skills-update/yang-skills.json, so /skills-update can tell whether this PC is behind.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const KEEP = new Set(["skills-update/sources.json", "skills-update/yang-claude.json"]);

const repo = dirname(fileURLToPath(import.meta.url));
const dest = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const only = args.filter((a) => !a.startsWith("--"));

const sameFile = (a, b) => existsSync(b) && readFileSync(a).equals(readFileSync(b));

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

// Copy one file and return what happened: added, updated, kept or same.
function install(src, target, keep) {
  if (sameFile(src, target)) return "same";
  if (keep && existsSync(target)) return "kept";
  const status = existsSync(target) ? "updated" : "added";
  if (!dryRun) {
    mkdirSync(dirname(target), { recursive: true });
    cpSync(src, target);
  }
  return status;
}

let problems = 0;

const skillsDir = join(repo, "skills");
const skills = readdirSync(skillsDir).filter((n) => statSync(join(skillsDir, n)).isDirectory());
const unknown = only.filter((name) => !skills.includes(name));
if (unknown.length) {
  console.error(`error  no skill named ${unknown.join(", ")} (have: ${skills.join(", ")})`);
  process.exit(1);
}

for (const name of skills) {
  if (only.length && !only.includes(name)) continue;
  const dir = join(skillsDir, name);
  const skillMd = join(dir, "SKILL.md");
  const declared = existsSync(skillMd) && readFileSync(skillMd, "utf8").match(/^name:\s*(\S+)/m)?.[1];
  if (declared !== name) {
    console.error(`error  skill ${name}: SKILL.md is missing or its name is not "${name}"`);
    problems++;
    continue;
  }
  const changes = [];
  for (const src of walk(dir)) {
    const rel = relative(skillsDir, src).split("\\").join("/");
    const status = install(src, join(dest, "skills", rel), KEEP.has(rel));
    if (status !== "same") changes.push(`${status} ${rel.slice(name.length + 1)}`);
  }
  console.log(`skill  ${name}: ${changes.length ? changes.join(", ") : "up to date"}`);
}

const agentsDir = join(repo, "agents");
if (existsSync(agentsDir)) {
  for (const file of readdirSync(agentsDir).filter((f) => f.endsWith(".md"))) {
    const status = install(join(agentsDir, file), join(dest, "agents", file), false);
    console.log(`agent  ${file}: ${status === "same" ? "up to date" : status}`);
  }
}

// Record the installed commit only when everything was installed from a clean checkout,
// otherwise the record would claim files that are not on this PC.
if (!dryRun && !only.length && !problems) {
  try {
    const git = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    if (git("status", "--porcelain").trim()) {
      console.log("note   uncommitted changes in the repo: installed commit not recorded");
    } else {
      const commit = git("rev-parse", "HEAD").trim();
      const record = join(dest, "skills", "skills-update", "yang-skills.json");
      mkdirSync(dirname(record), { recursive: true });
      writeFileSync(record, JSON.stringify({ commit }, null, 2) + "\n");
      console.log(`record yang-skills ${commit.slice(0, 7)}`);
    }
  } catch {
    console.log("note   not a git checkout: installed commit not recorded");
  }
}

console.log(dryRun ? "Dry run: nothing was written." : `Installed into ${dest}. Restart Claude Code to load changes.`);
process.exitCode = problems ? 1 : 0;
