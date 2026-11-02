// 업데이트된 스킬만 한 줄씩 출력: 종류 이름 저장소 경로 새해시
// copy = ~/.claude/skills 복사본 (sources.json), cli = npx skills 설치 (~/.agents/.skill-lock.json)
// macOS, Linux, Windows 공통. Node 18 이상과 gh만 필요.
import { existsSync, readFileSync } from "node:fs";
import { externalItems, graphifyLatest, graphifyVersionFile, treeSha } from "./lib.mjs";

const items = externalItems();
const shas = await Promise.all(items.map(([, , repo, path]) => treeSha(repo, path)));
items.forEach(([kind, name, repo, path, old], i) => {
  if (!shas[i]) console.log(`error ${name} ${repo} ${path}`);
  else if (shas[i] !== old) console.log(`${kind} ${name} ${repo} ${path} ${shas[i]}`);
});

// graphify는 CLI 버전으로 확인
if (existsSync(graphifyVersionFile)) {
  const latest = await graphifyLatest();
  if (!latest) console.log("error graphify pypi graphifyy");
  else if (latest !== readFileSync(graphifyVersionFile, "utf8").trim()) console.log(`graphify graphify pypi graphifyy ${latest}`);
}
