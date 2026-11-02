// 업데이트된 스킬만 한 줄씩 출력: 종류 이름 저장소 경로 새해시
// copy = ~/.claude/skills 복사본 (sources.json), cli = npx skills 설치 (~/.agents/.skill-lock.json)
// macOS, Linux, Windows 공통. Node 18 이상과 gh만 필요.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

const items = Object.entries(readJson(join(here, "sources.json"))).map(
  ([name, s]) => ["copy", name, s.repo, s.path, s.hash],
);
const lock = join(homedir(), ".agents", ".skill-lock.json");
if (existsSync(lock)) {
  for (const [name, s] of Object.entries(readJson(lock).skills ?? {})) {
    if (s.sourceType !== "github") continue;
    items.push(["cli", name, s.source, s.skillPath.replace(/\/?SKILL\.md$/, ""), s.skillFolderHash]);
  }
}

for (const [kind, name, repo, path, old] of items) {
  let sha;
  try {
    sha = execFileSync("gh", ["api", `repos/${repo}/git/trees/HEAD:${path}`, "--jq", ".sha"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    console.log(`error ${name} ${repo} ${path}`);
    continue;
  }
  if (sha !== old) console.log(`${kind} ${name} ${repo} ${path} ${sha}`);
}

// graphify는 CLI 버전으로 확인
const v = join(homedir(), ".claude", "skills", "graphify", ".graphify_version");
if (existsSync(v)) {
  try {
    const latest = (await (await fetch("https://pypi.org/pypi/graphifyy/json")).json()).info.version;
    if (latest && latest !== readFileSync(v, "utf8").trim()) console.log(`graphify graphify pypi graphifyy ${latest}`);
  } catch {
    console.log("error graphify pypi graphifyy");
  }
}
