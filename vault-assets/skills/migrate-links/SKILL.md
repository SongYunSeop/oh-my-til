---
name: migrate-links
description: "vault의 [[wikilink]]를 표준 마크다운 링크로 일괄 변환"
argument-hint: ""
plugin-version: "__PLUGIN_VERSION__"
---

# Migrate Links Skill

vault에 남아있는 `[[wikilink]]` 형식을 표준 마크다운 링크 `[text](path.md)`로 일괄 변환한다.

## 활성화 조건

- "/migrate-links"
- "위키링크 변환해줘", "wikilink를 마크다운 링크로 바꿔줘"

## 비활성화 조건

- 새 TIL 작성, 백로그 조회 등 다른 작업

## 대상 디렉토리

- `til/` (TIL 파일, backlog.md, TIL MOC.md)
- `Daily/` (Daily 노트)

## 제외 대상

- `.obsidian/`, `.claude/`, `node_modules/`, `.git/` 등 설정/시스템 디렉토리
- 이미 변환된 파일 (wikilink가 없는 파일은 건너뜀)

## 변환 규칙

| 기존 패턴 | 변환 결과 |
|-----------|-----------|
| `[[til/cat/slug\|Display]]` | `[Display](til/cat/slug.md)` |
| `[[til/cat/slug]]` | `[til/cat/slug](til/cat/slug.md)` |
| `[[path\|name]]` (테이블 내 이스케이프) | `[name](path.md)` |

- 경로에 `.md` 확장자가 없으면 자동 추가
- 경로에 이미 `.md`가 있으면 중복 추가하지 않음

## 워크플로우

### Phase 1: 스캔

1. `til/`, `Daily/` 디렉토리에서 `[[...]]` 패턴이 포함된 `.md` 파일을 검색한다
2. 파일별 wikilink 수를 집계한다
3. 결과를 테이블로 출력한다:

```
📋 스캔 결과:

| 파일 | wikilink 수 |
|------|------------|
| til/javascript/closure.md | 3 |
| Daily/2025-01-15.md | 5 |
| ... | ... |

총 N개 파일에서 M개의 wikilink 발견
```

4. wikilink가 없으면 "변환할 wikilink가 없습니다" 안내 후 종료
5. `AskUserQuestion`으로 변환 진행 여부를 확인한다 ("변환 진행" / "취소")

### Phase 2: 변환

1. 각 파일의 wikilink를 변환 규칙에 따라 표준 마크다운 링크로 변환한다
2. 변환 시 파일 단위로 처리하며, 각 파일 변환 후 결과를 출력한다

### Phase 3: 검증

1. 변환 대상 디렉토리를 다시 스캔하여 잔여 `[[...]]` 패턴이 없는지 확인한다
2. 잔여 wikilink가 있으면:
   - 해당 파일과 라인을 목록으로 출력한다
   - "수동 확인이 필요한 wikilink가 남아있습니다" 안내
3. 잔여 wikilink가 없으면: "모든 wikilink가 변환되었습니다" 확인

### Phase 4: 결과 요약 + 커밋

1. 파일별 변환 건수를 테이블로 요약 출력한다:

```
✅ 변환 완료:

| 파일 | 변환 수 |
|------|--------|
| til/javascript/closure.md | 3 |
| Daily/2025-01-15.md | 5 |
| ... | ... |

총 N개 파일, M개 링크 변환 완료
```

2. 변경된 파일을 하나의 atomic commit으로 커밋한다:
   - 커밋 메시지: `♻️ refactor: [[wikilink]] → 표준 마크다운 링크 일괄 변환`
   - push는 하지 않는다 (로컬 커밋만)

## 주의사항

- 코드 블록(``` ``` ```) 내부의 wikilink는 변환하지 않는다
- 마크다운 테이블 내 `\|`로 이스케이프된 파이프는 올바르게 처리한다
- 변환 전 Phase 1에서 반드시 사용자 확인을 받는다
