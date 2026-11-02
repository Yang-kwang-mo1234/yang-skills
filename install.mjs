// Install the skills and agents in this repo into ~/.claude (or $CLAUDE_CONFIG_DIR).
// macOS, Linux, Windows. Needs only Node 18+.
//
//   node install.mjs            install or update everything
//   node install.mjs <name...>  only these skills (agents are always installed)
//   node install.mjs --dry-run  show what would change
//
// Files in the repo overwrite the installed copies. Files listed in KEEP are local state
// that the skill itself updates, so they are copied only when missing.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
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

console.log(dryRun ? "Dry run: nothing was written." : `Installed into ${dest}. Restart Claude Code to load changes.`);
process.exitCode = problems ? 1 : 0;
