---
name: skills-update
description: yang-skills(직접 만든 스킬)를 최신으로 설치하고, yang-claude 저장소의 전역 설정 변경을 ~/.claude에 반영하고, 설치된 외부 스킬 중 업스트림이 바뀐 것을 업데이트한다. /skills-update 로만 실행.
disable-model-invocation: true
---

# Skills Update

0(yang-skills) → A(전역 설정) → B(외부 스킬) 순서로 한다. 하나가 막혀도 나머지는 진행한다.

## 0. yang-skills (직접 만든 스킬)

`~/workspace/yang-skills`(`YANG_SKILLS_DIR`가 있으면 그 폴더)를 이 PC에 맞춘다. 이 스킬 자신도 여기서 설치되므로 가장 먼저 한다.

1. 폴더가 없으면 "yang-skills 저장소 없음"이라고 하고 A로 간다. 있으면 `git -C <폴더> status --porcelain`이 비어 있는지 본다. 비어 있지 않으면 고치는 중인 것이니 pull, 설치하지 않고 그 사실만 보고하고 A로 간다.
2. `git -C <폴더> pull --ff-only`. 실패하면 이유를 보고하고 A로 간다.
3. `git -C <폴더> rev-parse HEAD`와 `~/.claude/skills/skills-update/yang-skills.json`의 `commit`을 비교한다. 같으면 "yang-skills 최신"이라고 하고 A로 간다.
4. 다르면 `git -C <폴더> log --oneline <기록된 커밋>..HEAD`로 바뀐 커밋을 보여 준다(기록 파일이 없거나 그 커밋을 찾을 수 없으면 최근 5개). 그다음 `node <폴더>/install.mjs`를 실행한다. 설치가 끝나면 커밋이 자동으로 기록된다.
5. 설치 출력에 `skill  skills-update: updated ... SKILL.md`가 있으면 지금 따르는 지침이 옛 버전이다. `~/.claude/skills/skills-update/SKILL.md`를 다시 읽고 A부터는 새 지침을 따른다.

## A. yang-claude 전역 설정 (저장소 → 이 PC)

`~/workspace/yang-claude`(`YANG_CLAUDE_DIR`가 있으면 그 폴더)의 `global/`을 `~/.claude`에 반영한다. PC → 저장소 방향은 하지 않는다. 아래 `Y`는 `node ~/.claude/skills/skills-update/yang-claude.mjs`를 뜻한다.

1. 저장소가 없으면 `git clone https://github.com/Yang-kwang-mo1234/yang-claude.git <폴더>`. 있으면 `git -C <폴더> pull --ff-only`. 실패하면(로컬 커밋, 수정 중인 파일 등) 이유를 보여 주고 A는 받아 둔 상태 그대로 진행할지 물어본다.
2. `Y plan` 실행. 출력이 없으면 "전역 설정 변경 없음"이라고 말하고 6단계로 간다. 출력된 줄(`상태 경로`)을 표로 보여 준다.
   - `add`, `update`: 저장소에서만 바뀐 것. 적용 대상.
   - `conflict`: PC에서도 고쳤거나 기준 커밋이 없어 판단할 수 없는 것. `Y stage <스크래치>/yc <경로>` 후 `diff -u <스크래치>/yc/old/<경로> <스크래치>/yc/new/<경로>`를 보여 주고, 파일마다 저장소 것으로 덮어쓸지 PC 것을 둘지 사용자가 고르게 한다.
   - `settings`: `settings.json` 병합 결과가 PC와 다르다. 위처럼 stage 해서 diff를 보여 준다. PC에만 있는 키는 그대로 남는다.
   - `settings-conflict <키>`: 양쪽 값이 달라 PC 값을 유지한 키. 키마다 어느 값을 쓸지 물어본다.
   - `local`, `removed`: PC만 바뀐 것, 저장소에서 지워진 것. 건드리지 않고 보고만 한다.
3. **보안 감사**: 적용할 것 중 `hooks/` 파일이나 `settings.json`이 있으면, 비어 있는 새 폴더 `<스크래치>/audit/yang-claude/`에 `Y stage <그 폴더> <경로...>`로 old/new를 만들고 `security-auditor`에 이름(`yang-claude`), 저장소(`Yang-kwang-mo1234/yang-claude`), old·new 폴더 경로만 넘긴다. 첫 줄이 `VERDICT: PASS`가 아니면 그 파일들은 적용하지 않고 발견 사항을 보여 준 뒤 사용자가 명시적으로 진행하라고 할 때까지 기다린다. 나머지 파일은 감사 없이 진행한다.
4. 적용: `Y apply <경로...> [--repo <키>]...`. 경로는 `add`·`update` 전부와 사용자가 덮어쓰기로 고른 `conflict`, `settings.json`(감사 통과 시). `--repo`는 저장소 값을 쓰기로 한 `settings-conflict` 키마다 하나씩. 덮어쓴 파일은 출력된 `backup` 폴더에 남는다.
5. 모든 항목이 적용됐거나 사용자가 PC 것을 두기로 정했으면 `Y done`으로 지금 커밋을 기준으로 기록한다. 감사에서 막혔거나 사용자가 나중에 정하겠다고 한 항목이 하나라도 있으면 `done`을 하지 않는다. 그래야 다음 실행에서 다시 나온다.
6. 바뀐 내용을 B의 보고와 함께 표로 보고한다. `settings.json`, 훅, 에이전트, `CLAUDE.md`가 바뀌었으면 Claude Code를 다시 시작해야 한다고 알린다.

## B. 외부 스킬

1. `node ~/.claude/skills/skills-update/check.mjs` 실행. 출력이 없으면 "외부 스킬 업데이트 없음"이라고 하고 5단계 보고로 간다.
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
