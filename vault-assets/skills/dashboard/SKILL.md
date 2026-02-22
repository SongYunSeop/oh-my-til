---
name: dashboard
description: "학습 대시보드 - 통계, 활동 히트맵, 카테고리, 백로그 진행률"
disable-model-invocation: true
plugin-version: "__PLUGIN_VERSION__"
---

# Dashboard Skill

학습 대시보드를 터미널에 표시한다.

## 활성화 조건

- "/dashboard"

## 비활성화 조건

- 백로그만 보고 싶을 때 → `/backlog` 사용
- 특정 주제를 학습하고 싶을 때 → `/til` 사용

## MCP 도구 활용

`oh-my-til` MCP 서버가 연결되어 있으면 `til_dashboard` MCP 도구를 호출한다.

`til_dashboard` 도구는 JSON 구조화 데이터를 반환한다:
```json
{
  "summary": { "totalTils": 23, "categoryCount": 5, "thisWeekCount": 3, "streak": 4 },
  "heatmap": { "cells": [{ "date": "2026-01-01", "count": 2, "level": 3 }], "maxCount": 5 },
  "categories": [{ "name": "react", "count": 5, "files": [{ "path": "til/react/hooks.md", "filename": "hooks.md", "mtime": 1740000000000 }] }],
  "backlog": { "totalDone": 77, "totalItems": 171, "categories": [{ "category": "react", "filePath": "til/react/backlog.md", "done": 10, "total": 15 }] }
}
```

이 데이터를 아래 형식으로 포맷하여 출력한다.

## 출력 형식

### 1. 요약 카드

```
📊 학습 대시보드

| 지표 | 값 |
|------|-----|
| 총 TIL | 23개 |
| 카테고리 | 5개 |
| 이번 주 | 3개 |
| 연속 학습 | 4일 |
```

### 2. 활동 추이 (스파크라인)

heatmap cells를 주단위로 합산하여 스파크라인 문자(`▁▂▃▅▇`)로 표시한다:

```
활동 추이 (90일)
▁▁▃▅▇▃▁▅▇▅▃▁▃
```

### 3. 카테고리별 현황

```
| 카테고리 | 수 | 최근 수정 |
|---------|-----|----------|
| react | 5 | 2026-02-20 |
| typescript | 4 | 2026-02-19 |
```

- 카테고리명은 `[카테고리](til/{카테고리}/backlog.md)` 마크다운 링크로 출력한다 (백로그가 있는 경우)
- 최근 수정일은 해당 카테고리의 가장 최근 파일 mtime 기준

### 4. 백로그 진행률

```
백로그 진행률: 77/171 (45%) ████░░░░░░

| 카테고리 | 진행률 | 완료 | 진행바 |
|---------|--------|------|--------|
| datadog | 96% | 24/25 | █████████░ |
| obsidian | 91% | 21/23 | █████████░ |
```

- 진행률 바는 10칸 기준 (`█` = 완료, `░` = 미완료)
- 진행률 내림차순 정렬

## MCP 도구를 사용할 수 없는 경우

`til_dashboard` 도구를 사용할 수 없으면, 다음 도구를 조합하여 폴백한다:

1. `til_list` — 전체 TIL 목록 + 카테고리별 분류
2. `til_backlog_status` — 백로그 진행률
3. `til_recent_context` (days: 7) — 최근 활동

이 3개 응답을 종합하여 위와 동일한 형식으로 출력한다 (히트맵은 생략).

## 주의사항

- 한국어로 출력한다
- 파일 경로를 그대로 노출하지 않는다. 반드시 `[표시명](경로)` 마크다운 링크로 출력한다
- 데이터가 없으면 "아직 학습 기록이 없습니다. `/til`로 첫 번째 학습을 시작해보세요."라고 안내한다
