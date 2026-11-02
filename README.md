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
- 저장소의 파일이 설치된 파일을 덮어씁니다. 스킬이 스스로 고치는 상태 파일(`skills-update/sources.json`)만 이미 있으면 그대로 둡니다.
- 여러 번 실행해도 안전합니다.
- `node install.mjs --dry-run`: 실제로 바꾸지 않고 바뀔 내용만 보여 줍니다.
- `node install.mjs <스킬 이름...>`: 지정한 스킬만 설치합니다. 에이전트는 항상 설치합니다.

## 업데이트

```bash
git -C ~/workspace/yang-skills pull
```

```bash
node ~/workspace/yang-skills/install.mjs
```

## 스킬 목록

| 이름 | 종류 | 하는 일 | 추가로 필요한 것 |
|---|---|---|---|
| `skills-update` | 스킬 | `/skills-update`로 실행. 설치된 외부 스킬 중 업스트림이 바뀐 것을 찾고, `security-auditor`의 감사를 통과한 것만 업데이트 | [GitHub CLI](https://cli.github.com) (`gh auth login`) |
| `security-auditor` | 에이전트 (Opus, 읽기 전용) | 스킬·CLI 업데이트를 설치 전에 감사하고 `VERDICT: PASS/FAIL`로 보고. `skills-update`가 사용 | - |

## 새 스킬 추가하기

1. `skills/<이름>/SKILL.md`를 만듭니다. 맨 위 `name:`은 폴더 이름과 같아야 합니다.
2. 스크립트가 필요하면 Node(`.mjs`)로 작성하고 경로는 `os.homedir()`, `path.join`으로 만듭니다. macOS와 Windows에서 그대로 돌아가게 하기 위해서입니다.
3. 스킬이 쓰는 에이전트는 `agents/<이름>.md`에 둡니다.
4. `node install.mjs <이름>`으로 설치해 확인하고, 위 표에 한 줄 추가합니다.

자세한 규칙은 [CLAUDE.md](CLAUDE.md)에 있습니다.
