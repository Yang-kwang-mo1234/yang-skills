// Install the skills and agents in this repo into ~/.claude (or $CLAUDE_CONFIG_DIR).
// macOS, Linux, Windows. Needs only Node 18+ (and git for --version).
//
//   node install.mjs                    install or update everything from this checkout
//   node install.mjs <name...>          only these skills (agents are always installed)
//   node install.mjs --version v1.2.0   install that release tag instead (also to roll back)
//   node install.mjs --dry-run          show what would change
//
// Files in the repo overwrite the installed copies. Files listed in KEEP are local state
// that the skill itself updates, so they are copied only when missing.
//
// A full install (no names, no --dry-run) records the commit and version in
// skills-update/yang-skills.json, so /skills-update can tell whether this PC is behind.
// From the checkout this needs a clean working tree; the version is the tag at HEAD,
// or dev-<sha> when HEAD is not a release.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const KEEP = new Set(["skills-update/sources.json", "skills-update/yang-claude.json"]);

const repo = dirname(fileURLToPath(import.meta.url));
const dest = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const ref = args.includes("--version") ? args[args.indexOf("--version") + 1] : null;
const only = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--version");

const git = (...a) =>
  execFileSync("git", ["-C", repo, ...a], { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 << 20 });

if (args.includes("--version") && !ref) {
  console.error("error  --version needs a tag, for example --version v1.2.0");
  process.exit(1);
}
if (ref) {
  try {
    git("rev-parse", "--verify", "--quiet", `${ref}^{commit}`);
  } catch {
    console.error(`error  no version ${ref} (run: git -C ${repo} fetch --tags, then git -C ${repo} tag)`);
    process.exit(1);
  }
}

// Repo files as paths relative to the repo root, read from the checkout or from the tag.
function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield relative(repo, p).split("\\").join("/");
  }
}
const repoFiles = ref
  ? git("ls-tree", "-r", "--name-only", ref, "--", "skills", "agents").toString().split("\n").filter(Boolean)
  : ["skills", "agents"].filter((d) => existsSync(join(repo, d))).flatMap((d) => [...walk(join(repo, d))]);
const readRepo = (rel) => (ref ? git("show", `${ref}:${rel}`) : readFileSync(join(repo, rel)));

// Write one file and return what happened: added, updated, kept or same.
function install(rel, target, keep) {
  const data = readRepo(rel);
  if (existsSync(target) && readFileSync(target).equals(data)) return "same";
  if (keep && existsSync(target)) return "kept";
  const status = existsSync(target) ? "updated" : "added";
  if (!dryRun) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, data);
  }
  return status;
}

let problems = 0;

const skills = [...new Set(repoFiles.filter((f) => f.startsWith("skills/")).map((f) => f.split("/")[1]))];
const unknown = only.filter((name) => !skills.includes(name));
if (unknown.length) {
  console.error(`error  no skill named ${unknown.join(", ")} (have: ${skills.join(", ")})`);
  process.exit(1);
}

for (const name of skills) {
  if (only.length && !only.includes(name)) continue;
  const files = repoFiles.filter((f) => f.startsWith(`skills/${name}/`));
  const skillMd = `skills/${name}/SKILL.md`;
  const declared = files.includes(skillMd) && readRepo(skillMd).toString("utf8").match(/^name:\s*(\S+)/m)?.[1];
  if (declared !== name) {
    console.error(`error  skill ${name}: SKILL.md is missing or its name is not "${name}"`);
    problems++;
    continue;
  }
  const changes = [];
  for (const file of files) {
    const rel = file.slice("skills/".length);
    const status = install(file, join(dest, "skills", rel), KEEP.has(rel));
    if (status !== "same") changes.push(`${status} ${rel.slice(name.length + 1)}`);
  }
  console.log(`skill  ${name}: ${changes.length ? changes.join(", ") : "up to date"}`);
}

for (const file of repoFiles.filter((f) => /^agents\/[^/]+\.md$/.test(f))) {
  const status = install(file, join(dest, file), false);
  console.log(`agent  ${file.slice("agents/".length)}: ${status === "same" ? "up to date" : status}`);
}

// Record what was installed only after a full install, otherwise the record would claim
// files that are not on this PC.
if (!dryRun && !only.length && !problems) {
  try {
    let commit, version;
    if (ref) {
      commit = git("rev-parse", `${ref}^{commit}`).toString().trim();
      version = ref;
    } else if (git("status", "--porcelain").toString().trim()) {
      console.log("note   uncommitted changes in the repo: installed version not recorded");
    } else {
      commit = git("rev-parse", "HEAD").toString().trim();
      try {
        version = git("describe", "--tags", "--exact-match", "--match", "v*", "HEAD").toString().trim();
      } catch {
        version = `dev-${commit.slice(0, 7)}`;
      }
    }
    if (commit) {
      const record = join(dest, "skills", "skills-update", "yang-skills.json");
      mkdirSync(dirname(record), { recursive: true });
      writeFileSync(record, JSON.stringify({ version, commit }, null, 2) + "\n");
      console.log(`record yang-skills ${version} (${commit.slice(0, 7)})`);
    }
  } catch {
    console.log("note   not a git checkout: installed version not recorded");
  }
}

console.log(dryRun ? "Dry run: nothing was written." : `Installed into ${dest}. Restart Claude Code to load changes.`);
process.exitCode = problems ? 1 : 0;
