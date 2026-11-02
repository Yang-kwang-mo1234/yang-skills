# yang-skills

Personal Claude Code skills and agents, installed on macOS and Windows with `node install.mjs`.

## Layout

- `skills/<name>/SKILL.md` (+ scripts, references): one folder per skill. The frontmatter `name:` must equal the folder name; `install.mjs` refuses it otherwise.
- `agents/<name>.md`: subagents that skills here depend on.
- `install.mjs`: copies both into `~/.claude` (or `$CLAUDE_CONFIG_DIR`). Repo files overwrite installed ones, except paths in its `KEEP` set (local state a skill rewrites itself, such as `skills-update/sources.json`). Add new state files there.
- `README.md`: Korean, user-facing. Add each new skill or agent to its table.
- `release.mjs`, `VERSION`, `CHANGELOG.md`: releases (see below).

## Cross-platform rules

- Helper scripts are Node ESM (`.mjs`), Node 18+, standard library only. Build paths with `os.homedir()` and `path.join`, never hard-coded `/` or `~`. Call tools with `execFileSync(cmd, args)`, not a shell string.
- Shell commands inside SKILL.md run in Claude Code's Bash tool, which is Git Bash on Windows. Stick to commands Git Bash has (`diff`, `tar`, `grep`, `cat`); avoid macOS-only ones (`sed -i ''`, `pbcopy`, `open`) and Linux-only flags.
- `.gitattributes` keeps every text file LF on both systems.

## Workflow

- Edit the skill here, then `node install.mjs <name>` to install it and test it in Claude Code.
- `node install.mjs --dry-run` shows what would change without writing.

## Releases

- One version for the whole repo: `VERSION` plus an annotated tag `vX.Y.Z`. `/skills-update` installs only the highest tag (`install.mjs --version <tag>`), so other PCs get a change only after it is released. yang-claude is versioned the same way.
- patch: fixes and wording. minor: a new skill, agent or feature. major: something that breaks an existing setup (a renamed skill, a changed state file format).
- To release, run `node release.mjs <patch|minor|major>` (or `node release.mjs <bump> ~/workspace/yang-claude`). It bumps `VERSION` and adds a `CHANGELOG.md` section from the commit subjects since the last tag, and prints the add, commit, tag and push commands. It never commits; run each printed command on its own so the guarded ones show their prompt. Tidy the CHANGELOG section into user-facing Korean before committing.
