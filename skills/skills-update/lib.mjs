// check.mjs, status.mjs 가 같이 쓰는 확인 함수. macOS, Linux, Windows 공통. Node 18 이상.
import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
export const here = dirname(fileURLToPath(import.meta.url));
export const claudeDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
export const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
export const readJsonOr = (p, fallback) => (existsSync(p) ? readJson(p) : fallback);

// 외부 스킬: [종류, 이름, 저장소, 경로, 설치된 해시]
// copy = ~/.claude/skills 복사본 (sources.json), cli = npx skills 설치 (~/.agents/.skill-lock.json)
export function externalItems() {
  const items = Object.entries(readJsonOr(join(here, "sources.json"), {})).map(
    ([name, s]) => ["copy", name, s.repo, s.path, s.hash],
  );
  const lock = readJsonOr(join(homedir(), ".agents", ".skill-lock.json"), {});
  for (const [name, s] of Object.entries(lock.skills ?? {})) {
    if (s.sourceType !== "github") continue;
    items.push(["cli", name, s.source, s.skillPath.replace(/\/?SKILL\.md$/, ""), s.skillFolderHash]);
  }
  return items;
}

// 업스트림 HEAD 에서 그 폴더의 트리 해시. 찾지 못하면 null.
export async function treeSha(repo, path) {
  try {
    const { stdout } = await run("gh", ["api", `repos/${repo}/git/trees/HEAD:${path}`, "--jq", ".sha"]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export const graphifyVersionFile = join(claudeDir, "skills", "graphify", ".graphify_version");

// PyPI 의 graphifyy 최신 버전. 실패하면 null.
export async function graphifyLatest() {
  try {
    return (await (await fetch("https://pypi.org/pypi/graphifyy/json")).json()).info.version || null;
  } catch {
    return null;
  }
}

// git 저장소의 가장 높은 v* 태그. fetch 를 먼저 하면 원격의 새 태그도 본다. 없으면 null.
export async function latestTag(repo, { fetchFirst = false } = {}) {
  if (!existsSync(join(repo, ".git"))) return null;
  if (fetchFirst) await run("git", ["-C", repo, "fetch", "--tags", "--quiet", "origin"]).catch(() => {});
  try {
    const { stdout } = await run("git", ["-C", repo, "tag", "--list", "v*", "--sort=-v:refname"]);
    return stdout.split("\n")[0].trim() || null;
  } catch {
    return null;
  }
}

// 그 커밋(또는 태그)의 skills/ 아래 폴더 이름들. 실패하면 [].
export async function skillsAt(repo, ref) {
  try {
    const { stdout } = await run("git", ["-C", repo, "ls-tree", "--name-only", `${ref}:skills`]);
    return stdout.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}
