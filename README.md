# yang-skills

직접 만들어 쓰는 Claude Code 스킬과 에이전트를 관리하는 저장소입니다.
macOS와 Windows에서 같은 명령으로 설치합니다.

## 설치

필요한 것: [Node.js](https://nodejs.org) 18 이상, [git](https://git-scm.com).
Windows에서는 Claude Code가 쓰는 Git for Windows(Git Bash)가 있어야 합니다.

macOS / Linux:

```bash
git clone https://github.com/Yang-kwang-mo1234/yang-skills.git ~/workspace/yang-skills
```

```bash
node ~/workspace/yang-skills/install.mjs
```

Windows (PowerShell):

```powershell
git clone https://github.com/Yang-kwang-mo1234/yang-skills.git $HOME\workspace\yang-skills
node $HOME\workspace\yang-skills\install.mjs
```

설치 후 Claude Code를 다시 시작하면 적용됩니다.

- `skills/`는 `~/.claude/skills/`로, `agents/`는 `~/.claude/agents/`로 복사합니다. `CLAUDE_CONFIG_DIR`가 있으면 그 폴더에 설치합니다.
- 저장소의 파일이 설치된 파일을 덮어씁니다. 스킬이 스스로 고치는 상태 파일(`skills-update/sources.json`, `skills-update/yang-claude.json`)만 이미 있으면 그대로 둡니다.
- 여러 번 실행해도 안전합니다.
- 전체 설치가 끝나면 설치한 버전과 커밋을 `~/.claude/skills/skills-update/yang-skills.json`에 기록합니다. `/skills-update`가 이 기록으로 이 PC가 뒤처졌는지 판단합니다. 커밋하지 않은 변경이 있거나 일부 스킬만 설치하면 기록하지 않습니다.
- `node install.mjs --version v1.2.0`: 작업 폴더 대신 그 릴리스 태그의 파일을 설치합니다. 예전 버전으로 되돌릴 때도 씁니다.
- `node install.mjs --dry-run`: 실제로 바꾸지 않고 바뀔 내용만 보여 줍니다.
- `node install.mjs <스킬 이름...>`: 지정한 스킬만 설치합니다. 에이전트는 항상 설치합니다.

## 업데이트

Claude Code에서 `/skills-update`를 실행하면 최신 릴리스를 받아 설치합니다. 직접 하려면:

```bash
git -C ~/workspace/yang-skills fetch --tags
```

```bash
node ~/workspace/yang-skills/install.mjs --version v1.0.0
```

## 버전과 릴리스

- 저장소 전체에 버전 하나를 둡니다: `VERSION` 파일과 `vX.Y.Z` 태그. 바뀐 내용은 [CHANGELOG.md](CHANGELOG.md)에 있습니다.
- `/skills-update`는 가장 높은 태그만 설치합니다. main에 커밋만 하고 릴리스하지 않은 변경은 다른 PC에 퍼지지 않습니다.
- 되돌리기: `/skills-update yang-skills v1.0.0` 또는 `node install.mjs --version v1.0.0`. yang-claude 설정은 `/skills-update yang-claude v1.0.0`.
- 지금 설치된 버전은 `~/.claude/skills/skills-update/yang-skills.json`에 있습니다. 작업 폴더에서 바로 설치하면 `dev-<커밋>`으로 기록됩니다.
- 릴리스 만들기: `node release.mjs patch`(수정) / `minor`(기능 추가) / `major`(호환 깨짐). `VERSION`을 올리고 지난 태그 이후 커밋으로 `CHANGELOG.md` 항목을 만든 뒤, 커밋·태그·push 명령을 보여 줍니다. yang-claude는 `node release.mjs patch ~/workspace/yang-claude`.

## 스킬 목록

| 이름 | 종류 | 하는 일 | 추가로 필요한 것 |
|---|---|---|---|
| `skills-update` | 스킬 | `/skills-update`로 실행. 이 저장소(yang-skills)를 최신 릴리스 태그로 설치하고, [yang-claude](https://github.com/Yang-kwang-mo1234/yang-claude)의 최신 릴리스 `global/`을 `~/.claude`에 반영(마지막 반영 버전 기준 3-way 비교, PC에서도 고친 파일은 diff를 보고 선택, `settings.json`은 키 단위 병합, 훅·설정 변경은 감사 후 적용)하고, 설치된 외부 스킬 중 업스트림이 바뀐 것을 `security-auditor`의 감사를 통과한 것만 업데이트. 두 저장소 모두 특정 버전으로 되돌릴 수 있음. `/skills-update status`는 설치된 모든 스킬의 `현재 → 신규` 버전만 보여 주고 아무것도 바꾸지 않음 | [GitHub CLI](https://cli.github.com) (`gh auth login`), git |
| `security-auditor` | 에이전트 (Opus, 읽기 전용) | 스킬·CLI 업데이트를 설치 전에 감사하고 `VERDICT: PASS/FAIL`로 보고. `skills-update`가 사용 | - |

## 새 스킬 추가하기

1. `skills/<이름>/SKILL.md`를 만듭니다. 맨 위 `name:`은 폴더 이름과 같아야 합니다.
2. 스크립트가 필요하면 Node(`.mjs`)로 작성하고 경로는 `os.homedir()`, `path.join`으로 만듭니다. macOS와 Windows에서 그대로 돌아가게 하기 위해서입니다.
3. 스킬이 쓰는 에이전트는 `agents/<이름>.md`에 둡니다.
4. `node install.mjs <이름>`으로 설치해 확인하고, 위 표에 한 줄 추가합니다.

자세한 규칙은 [CLAUDE.md](CLAUDE.md)에 있습니다.
