// 설치된 모든 스킬의 업데이트 여부를 한 줄씩 출력한다. 아무것도 바꾸지 않는다 (git fetch 만 한다).
// 줄 형식 (탭 구분): 상태 이름 위치 출처 현재 신규
//   상태: update(새 버전 있음) latest(최신) untracked(출처를 몰라 확인 못 함) error(확인 실패)
//   위치: claude = ~/.claude/skills, agents = ~/.agents/skills, global = yang-claude 전역 설정
// 버전은 출처마다 다르다: yang-skills·yang-claude 는 릴리스 태그, 외부 스킬은 폴더 해시 7자리,
// graphify 는 PyPI 버전. macOS, Linux, Windows 공통. Node 18 이상, git, gh.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  claudeDir, externalItems, graphifyLatest, graphifyVersionFile, here, latestTag, readJsonOr, skillsAt, treeSha,
} from "./lib.mjs";

const ysRepo = process.env.YANG_SKILLS_DIR || join(homedir(), "workspace", "yang-skills");
const ycRepo = process.env.YANG_CLAUDE_DIR || join(homedir(), "workspace", "yang-claude");
const short = (h) => (h ? h.slice(0, 7) : "-");

// 스킬 폴더 목록. SKILL.md 가 없고 하위 폴더에 스킬이 있으면 묶음(이름/)으로 하나만 센다.
function listSkills(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (existsSync(join(p, "SKILL.md"))) out.push(name);
    else {
      try {
        if (readdirSync(p).some((c) => existsSync(join(p, c, "SKILL.md")))) out.push(`${name}/`);
      } catch {
        // 파일이거나 읽을 수 없는 항목은 스킬이 아니다
      }
    }
  }
  return out.sort();
}

// 같은 저장소를 여러 번 조회하지 않도록 비동기 결과를 묶어 둔다.
const memo = new Map();
const once = (key, fn) => (memo.has(key) ? memo.get(key) : memo.set(key, fn()).get(key));

const [ysTag, ycTag] = await Promise.all([
  latestTag(ysRepo, { fetchFirst: true }),
  latestTag(ycRepo, { fetchFirst: true }),
]);
const ysState = readJsonOr(join(here, "yang-skills.json"), {});
const ycState = readJsonOr(join(here, "yang-claude.json"), {});
const ysSkills = new Set([
  ...(ysTag ? await skillsAt(ysRepo, ysTag) : []),
  ...(ysState.commit ? await skillsAt(ysRepo, ysState.commit) : []),
]);
const external = new Map(externalItems().map((it) => [`${it[0]}:${it[1]}`, it]));

const versionRow = (name, where, source, current, next) => {
  if (!next) return ["error", name, where, source, current ?? "-", "-"];
  return [current === next ? "latest" : "update", name, where, source, current ?? "미기록", next];
};

async function claudeRow(name) {
  const where = "claude";
  if (name === "graphify" && existsSync(graphifyVersionFile)) {
    const current = readFileSync(graphifyVersionFile, "utf8").trim();
    return versionRow(name, where, "pypi graphifyy", current, await once("pypi", graphifyLatest));
  }
  const copy = external.get(`copy:${name}`);
  if (copy) {
    const [, , repo, path, hash] = copy;
    const sha = await once(`${repo}:${path}`, () => treeSha(repo, path));
    return versionRow(name, where, repo, short(hash), sha && short(sha));
  }
  if (ysSkills.has(name)) return versionRow(name, where, "yang-skills", ysState.version, ysTag);
  return ["untracked", name, where, "-", "-", "-"];
}

async function agentsRow(name) {
  const cli = external.get(`cli:${name}`);
  if (!cli) return ["untracked", name, "agents", "-", "-", "-"];
  const [, , repo, path, hash] = cli;
  const sha = await once(`${repo}:${path}`, () => treeSha(repo, path));
  return versionRow(name, "agents", repo, short(hash), sha && short(sha));
}

const rows = await Promise.all([
  ...listSkills(join(claudeDir, "skills")).map(claudeRow),
  ...listSkills(join(homedir(), ".agents", "skills")).map(agentsRow),
]);
rows.push(versionRow("yang-claude", "global", "yang-claude", ycState.version, ycTag));

console.log(["상태", "이름", "위치", "출처", "현재", "신규"].join("\t"));
for (const row of rows) console.log(row.join("\t"));
