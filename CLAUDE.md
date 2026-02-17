# CLAUDE.md - obsidian-claude-til

## 프로젝트 개요

Obsidian 플러그인. 사이드바에 Claude Code 터미널을 임베딩하여 TIL 학습 워크플로우를 Obsidian 안에서 실행한다. xterm.js + node-pty 기반.

핵심 흐름: 커맨드 팔레트 → 터미널 열기 → Claude Code에서 `/til`, `/backlog`, `/research` 스킬 직접 실행 → 새 파일 감지 시 에디터에서 열기

Obsidian의 역할은 "터미널 임베딩 + 파일 감시 + skill 배포"로 한정하고, 워크플로우 주도권은 Claude Code에 있다.

## 기술 스택

- TypeScript + Obsidian Plugin API
- xterm.js (@xterm/xterm) — 터미널 렌더링
- node-pty — PTY(의사 터미널) 프로세스 관리
- @electron/rebuild — 네이티브 모듈 재빌드 (Electron 37.10.2)
- esbuild — 번들러

## 핵심 레퍼런스

- [claude-code-terminal](https://github.com/dternyak/claude-code-terminal) — xterm.js + node-pty Obsidian 통합 패턴의 원본 구현

## 구조

```
src/
├── main.ts               ← TILPlugin 진입점 (터미널 뷰 + watcher + skill 설치)
├── settings.ts           ← 설정 탭 + 인터페이스
├── skills.ts             ← Skill 자동 설치 (.claude/skills/)
├── watcher.ts            ← 새 TIL 파일 감지 → 에디터에서 열기
└── terminal/
    ├── TerminalView.ts   ← 사이드바 터미널 (ItemView + xterm.js)
    └── pty.ts            ← PTY 프로세스 관리 (node-pty)

__tests__/
├── mock-obsidian.ts      ← obsidian 모듈 mock
├── utils.test.ts         ← 설정 기본값 테스트
├── skills.test.ts        ← skill 자동 설치 로직 테스트
└── watcher.test.ts       ← 파일 감시 필터링 로직 테스트
```

## 빌드

```bash
npm install
npm run rebuild-pty    # node-pty를 Obsidian Electron 버전에 맞춰 재빌드
npm run dev            # 워치 모드
npm run build          # 프로덕션 빌드
```

## 규칙

- Obsidian API는 `obsidian` 모듈에서 import
- node-pty는 `electronRequire`로 로드 (일반 import 불가, 네이티브 모듈)
- `onload()`에서 등록한 리소스는 자동 해제됨
- `onunload()`에서 PTY 프로세스를 반드시 kill
- 파일 감시는 `vault.on('create', ...)` 사용
- manifest.json의 `isDesktopOnly`는 반드시 `true` (node-pty 네이티브 모듈 때문)
- esbuild에서 node-pty는 external로 처리
- UI 워크플로우(주제 입력, 백로그 선택)는 Claude Code 스킬이 담당 — Obsidian 쪽에서 중복 구현하지 않는다
- 한국어 작성, 기술 용어 원어 병기

## 참고 문서

- [Obsidian Developer Docs](https://docs.obsidian.md/Home)
- [Plugin API Reference](https://docs.obsidian.md/Reference/TypeScript+API/Plugin)
- [xterm.js docs](https://xtermjs.org/docs/)
- [node-pty (GitHub)](https://github.com/microsoft/node-pty)
- [claude-code-terminal 소스](https://github.com/dternyak/claude-code-terminal)
