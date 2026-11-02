// yang-claude 저장소의 global/ 을 ~/.claude 에 반영한다 (저장소 → PC 한 방향).
// 마지막으로 반영한 커밋(yang-claude.json)을 기준으로 3-way 비교해서, 저장소만 바뀐 파일과
// PC에서도 고친 파일(충돌)을 구분한다. macOS, Linux, Windows 공통. Node 18 이상과 git만 필요.
//
//   node yang-claude.mjs plan                     바뀐 것만 한 줄씩: 상태 경로
//   node yang-claude.mjs stage <폴더> <경로...>    <폴더>/old 에 PC 파일, <폴더>/new 에 적용될 파일 (감사·diff용)
//   node yang-claude.mjs apply <경로...> [--repo <키>]...  백업 후 반영. settings.json 충돌 키는 --repo 로 준 것만 저장소 값
//   node yang-claude.mjs done                     지금 저장소 HEAD 를 반영 기준으로 기록
//
// 상태: add(PC에 없음) update(저장소만 바뀜) conflict(둘 다 바뀜, 또는 기준 없이 다름)
//       local(PC만 바뀜, 건드리지 않음) removed(저장소에서 지워짐, 건드리지 않음)
//       settings(병합 결과가 PC와 다름) settings-conflict <키>(양쪽 값이 달라 PC 값을 유지한 키)
import { execFileSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const stateFile = join(here, "yang-claude.json");
const repo = process.env.YANG_CLAUDE_DIR || join(homedir(), "workspace", "yang-claude");
const src = join(repo, "global");
const dest = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
const SETTINGS = "settings.json";

const git = (...args) =>
  execFileSync("git", ["-C", repo, ...args], { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 << 20 });
const readOrNull = (p) => (existsSync(p) ? readFileSync(p) : null);
const same = (a, b) => (a === null ? b === null : b !== null && a.equals(b));

const base = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")).commit : null;

// 기준 커밋의 global/<경로> 내용. 기준이 없거나 그 커밋에 파일이 없으면 null.
function baseFile(rel) {
  if (!base) return null;
  try {
    return git("show", `${base}:global/${rel}`);
  } catch {
    return null;
  }
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield relative(src, p).split("\\").join("/");
  }
}

// ---- settings.json 3-way 병합 ----

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function equal(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => equal(x, b[i]));
  }
  if (isObj(a) && isObj(b)) {
    const ka = Object.keys(a);
    return ka.length === Object.keys(b).length && ka.every((k) => k in b && equal(a[k], b[k]));
  }
  return a === b;
}

// 배열은 집합으로 본다: PC 항목에서 저장소가 지운 것을 빼고, 저장소가 새로 넣은 것을 뒤에 붙인다.
function mergeArray(b, pc, rp) {
  const has = (list, x) => list.some((y) => equal(x, y));
  const removed = b.filter((x) => !has(rp, x));
  const out = pc.filter((x) => !has(removed, x));
  for (const x of rp) if (!has(b, x) && !has(out, x)) out.push(x);
  return out;
}

// undefined 는 "키 없음". 충돌 키는 conflicts 에 모으고, takeRepo 에 있으면 저장소 값, 아니면 PC 값.
function merge3(b, pc, rp, path, conflicts, takeRepo) {
  if (equal(rp, b) || equal(pc, rp)) return pc;
  if (equal(pc, b)) return rp;
  if (isObj(pc) && isObj(rp)) {
    const bo = isObj(b) ? b : {};
    const out = {};
    for (const k of new Set([...Object.keys(pc), ...Object.keys(rp)])) {
      const v = merge3(bo[k], pc[k], rp[k], path ? `${path}.${k}` : k, conflicts, takeRepo);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  if (Array.isArray(pc) && Array.isArray(rp)) return mergeArray(Array.isArray(b) ? b : [], pc, rp);
  conflicts.push(path);
  return takeRepo.includes(path) ? rp : pc;
}

const parse = (buf) => (buf === null ? undefined : JSON.parse(buf.toString("utf8")));

function mergedSettings(takeRepo = []) {
  const pcBuf = readOrNull(join(dest, SETTINGS));
  const conflicts = [];
  const merged = merge3(
    parse(baseFile(SETTINGS)),
    parse(pcBuf),
    parse(readFileSync(join(src, SETTINGS))),
    "",
    conflicts,
    takeRepo,
  );
  const text = Buffer.from(JSON.stringify(merged, null, 2) + "\n");
  // 내용이 같으면 PC 파일의 들여쓰기·줄바꿈을 그대로 둔다
  const changed = pcBuf === null || !equal(merged, parse(pcBuf));
  return { text, changed, conflicts };
}

// ---- 명령 ----

function plan() {
  const out = [];
  for (const rel of walk(src)) {
    if (rel === SETTINGS) {
      const { changed, conflicts } = mergedSettings();
      if (changed) out.push(`settings ${rel}`);
      for (const key of conflicts) out.push(`settings-conflict ${key}`);
      continue;
    }
    const rp = readFileSync(join(src, rel));
    const pc = readOrNull(join(dest, rel));
    const b = baseFile(rel);
    if (same(pc, rp)) continue;
    if (pc === null) out.push(`add ${rel}`);
    else if (b !== null && same(rp, b)) out.push(`local ${rel}`);
    else if (b !== null && same(pc, b)) out.push(`update ${rel}`);
    else out.push(`conflict ${rel}`);
  }
  if (base) {
    try {
      const gone = git("diff", "--name-only", "--diff-filter=D", base, "HEAD", "--", "global/").toString();
      for (const line of gone.split("\n").filter(Boolean)) out.push(`removed ${line.slice("global/".length)}`);
    } catch {
      // 기준 커밋이 히스토리에 없으면 지워진 파일은 알 수 없다
    }
  }
  console.log(out.join("\n"));
}

function stage(dir, rels) {
  for (const rel of rels) {
    const pc = readOrNull(join(dest, rel));
    const next = rel === SETTINGS ? mergedSettings().text : readFileSync(join(src, rel));
    for (const [side, buf] of [["old", pc], ["new", next]]) {
      if (buf === null) continue;
      const p = join(dir, side, rel);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, buf);
    }
  }
}

function apply(rels, takeRepo) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  const backupDir = join(dest, "backups", "skills-update", stamp);
  for (const rel of rels) {
    const target = join(dest, rel);
    if (existsSync(target)) {
      mkdirSync(dirname(join(backupDir, rel)), { recursive: true });
      cpSync(target, join(backupDir, rel));
    }
    mkdirSync(dirname(target), { recursive: true });
    if (rel === SETTINGS) writeFileSync(target, mergedSettings(takeRepo).text);
    else cpSync(join(src, rel), target);
    if (rel.startsWith("hooks/")) chmodSync(target, 0o755);
    console.log(`applied ${rel}`);
  }
  if (existsSync(backupDir)) console.log(`backup ${backupDir}`);
}

function done() {
  const commit = git("rev-parse", "HEAD").toString().trim();
  writeFileSync(stateFile, JSON.stringify({ commit }, null, 2) + "\n");
  console.log(`recorded ${commit}`);
}

if (!existsSync(src)) {
  console.error(`error no ${src} (set YANG_CLAUDE_DIR or clone yang-claude there)`);
  process.exit(1);
}

const [cmd, ...args] = process.argv.slice(2);
const takeRepo = args.flatMap((a, i) => (args[i - 1] === "--repo" ? [a] : []));
const paths = args.filter((a, i) => a !== "--repo" && args[i - 1] !== "--repo");

if (cmd === "plan") plan();
else if (cmd === "stage" && paths.length > 1) stage(paths[0], paths.slice(1));
else if (cmd === "apply" && paths.length) apply(paths, takeRepo);
else if (cmd === "done") done();
else {
  console.error("usage: yang-claude.mjs plan | stage <dir> <path...> | apply <path...> [--repo <key>]... | done");
  process.exit(1);
}
