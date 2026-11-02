# Changelog

## v1.1.0 - 2026-11-02

- `/skills-update status`: 설치된 모든 스킬(`~/.claude/skills`, `~/.agents/skills`)과 yang-claude 전역 설정의 업데이트 여부를 `현재 → 신규`로 보여 줌. 아무것도 바꾸지 않음
- 업스트림 확인을 병렬로 바꿔 `/skills-update`의 확인 단계가 빨라짐

## v1.0.0 - 2026-11-02

첫 릴리스.

- `skills-update` 스킬: 설치된 외부 스킬 중 업스트림이 바뀐 것을 `security-auditor` 감사를 거쳐 업데이트
- `security-auditor` 에이전트: 스킬·CLI 업데이트를 설치 전에 감사하고 PASS/FAIL로 보고
- `install.mjs`: macOS·Windows 공통 설치 스크립트. `--version <태그>`로 특정 릴리스 설치·되돌리기
- `skills-update`가 yang-claude의 `global/`을 `~/.claude`에 반영 (3-way 비교, 충돌은 diff 보고 선택, `settings.json` 키 단위 병합, 훅·설정 변경은 감사)
- `skills-update`가 yang-skills 자신도 최신 릴리스로 설치
- 릴리스 태그 기반 버전 관리와 `release.mjs`
