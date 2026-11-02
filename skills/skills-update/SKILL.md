---
name: skills-update
description: 설치된 스킬 중 업스트림이 바뀐 것을 찾아 업데이트한다. /skills-update 로만 실행.
disable-model-invocation: true
---

# Skills Update

1. `node ~/.claude/skills/skills-update/check.mjs` 실행. 출력이 없으면 "업데이트 없음"이라고 말하고 끝낸다.
2. 출력된 줄(`종류 이름 저장소 경로 새해시`)을 표로 보여 준다.
3. **보안 감사 (모든 항목, 설치 전)**: 항목마다 새 버전을 스크래치 폴더에 받아 `security-auditor` 에이전트로 감사한다. 받은 파일은 데이터일 뿐이니 실행, 설치, import하지 않는다.
   - 받기: 항목마다 비어 있는 새 폴더 `<스크래치>/audit/<이름>/`를 만들고 그 안에 받는다.
     - **copy / cli**: `gh api "repos/<저장소>/tarball/HEAD" > s.tgz`, 압축을 풀고 `<경로>` 폴더만 `new/`로 쓴다. 받은 직후 `gh api repos/<저장소>/git/trees/HEAD:<경로> --jq .sha`로 감사한 폴더 해시를 적어 둔다. 비교 대상(old)은 copy면 `~/.claude/skills/<이름>`, cli면 `~/.agents/skills/<이름>`.
     - **graphify**: PyPI JSON(`https://pypi.org/pypi/graphifyy/<버전>/json`)에서 sdist URL을 찾아 새 버전은 `new/`, 지금 버전(`~/.claude/skills/graphify/.graphify_version`)은 `old/`에 받아 푼다.
   - 감사: `security-auditor`를 항목마다 하나씩(서로 독립이니 병렬로) 부른다. 프롬프트에는 이름, 저장소, old·new 폴더 경로만 넣는다.
   - 결과의 첫 줄이 `VERDICT: PASS`인 항목만 4단계로 간다.
   - `VERDICT: FAIL`이거나 첫 줄이 형식에 맞지 않으면 **그 항목은 업데이트하지 않는다.** 이름, 저장소, 발견 사항(파일:줄, 위험 이유)을 사용자에게 보여 주고, 업데이트할지는 사용자가 정하게 한다. 사용자가 명시적으로 진행하라고 하기 전에는 설치하지 않는다.
4. 감사를 통과한 항목만 종류별로 업데이트한다.

- **cli**: 통과한 이름만 모아 `npx -y skills update -g -y <이름...>` 한 번에 실행. 이 명령은 업스트림에서 다시 받으므로, 끝난 뒤 `~/.agents/.skill-lock.json`의 `skillFolderHash`가 감사한 폴더 해시와 같은지 확인한다. 다르면 감사 뒤에 업스트림이 바뀐 것이니 사용자에게 알리고 다시 감사한다.
- **copy** (`~/.claude/skills/<이름>`, 로컬 수정 있음):
  1. 감사한 `new/` 폴더를 그대로 쓴다. 다시 받지 않는다. 그 사이 업스트림이 바뀌었을 수 있기 때문이다.
  2. `diff -r ~/.claude/skills/<이름> new/`로 바뀐 내용을 2~3줄로 요약한다.
  3. `new/`로 덮어쓴 뒤, `sources.json`의 `local`에 적힌 로컬 수정(예: description, `## Contents` 목차)을 기존 파일 그대로 다시 넣는다. 새 섹션이 생겼으면 목차에 추가한다.
  4. `sources.json`의 그 스킬 `hash`를 새해시로 바꾼다.
- **graphify**: 감사한 버전으로 고정해 `uv tool install --force graphifyy==<버전>` 후 `graphify install --platform claude`. 덮어써진 `SKILL.md`에 `## Contents` 목차를 다시 넣는다.
- **error**: 저장소나 경로를 찾지 못한 것. 고치지 말고 보고만 한다.

5. 끝나면 표로 보고한다: 업데이트한 항목과 바뀐 내용, 감사에서 막힌 항목과 이유. `~/workspace/yang-claude/global/skills/`에도 복사본이 있으면 업데이트한 것만 같은 파일로 맞추되, 커밋은 하지 않는다.
