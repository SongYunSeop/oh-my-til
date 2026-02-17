---
name: til
description: "Today I Learned - 주제를 리서치하고 대화형으로 학습한 뒤 Obsidian 호환 TIL 마크다운으로 저장"
argument-hint: "<주제> [카테고리]"
plugin-version: "0.1.3"
---

# TIL (Today I Learned) Skill

주제를 리서치하고, 대화형으로 학습을 도와준 뒤, 결과물을 Obsidian 호환 TIL 마크다운 파일로 저장합니다.

## 활성화 조건

- "오늘 배운 것 정리해줘"
- "TIL 작성해줘"
- "/til <주제>"
- "<주제>에 대해 학습하고 TIL로 정리해줘"

## 비활성화 조건

- 넓은 주제의 학습 로드맵이 필요할 때 → `/research` 사용
- 백로그 진행 상황만 확인할 때 → `/backlog` 사용
- 이미 작성된 TIL을 수정하고 싶을 때 → 직접 파일을 편집
- 주제가 너무 넓어서 TIL 한 장으로 정리할 수 없을 때 → `/research`로 분해 후 개별 `/til`

## MCP 도구 활용

`claude-til` MCP 서버가 연결되어 있으면 MCP 도구를 활용한다:

- **Phase 1 시작 전**: `til_list`로 기존 TIL 목록을 확인하여 동일/유사 주제 중복 방지
- **Phase 2 중**: `vault_search`로 vault 내 관련 노트를 검색하여 `[[wikilink]]` 후보 파악
- **Phase 3 저장 전**: `vault_get_active_file`로 사용자가 보고 있는 파일 컨텍스트 확인

MCP 도구를 사용할 수 없는 경우에도 워크플로우는 정상 동작한다.

## 워크플로우

### Phase 1: 주제 리서치

1. 사용자가 제공한 주제를 웹 검색과 문서를 통해 조사한다
2. 핵심 개념, 예시, 관련 자료를 수집한다
3. 수집한 내용을 사용자에게 요약해서 보여준다

### Phase 2: 대화형 학습

1. 리서치 결과를 바탕으로 핵심 내용을 설명한다
2. 사용자가 궁금한 점을 질문하면 답변한다
3. 사용자가 충분히 이해했다고 판단되면 Phase 3으로 넘어간다
4. 사용자가 "저장해줘", "정리해줘", "TIL로 만들어줘" 등을 말하면 Phase 3으로 전환한다

### Phase 3: TIL 마크다운 저장

1. 학습 내용을 아래 템플릿에 맞춰 정리한다
2. 카테고리가 지정되지 않았으면 주제에 맞는 카테고리를 자동 추천한다
3. `./til/{카테고리}/{주제슬러그}.md`에 저장한다. 동일 슬러그가 있으면 사용자에게 확인한다
4. Daily 노트에 TIL 링크를 추가한다
5. TIL MOC(Map of Content)를 업데이트한다
6. 저장 완료 후 파일 경로를 알려준다

## 저장 경로 규칙

```
./til/
├── TIL MOC.md              ← Obsidian MOC (Map of Content)
├── javascript/
│   ├── closure.md
│   └── event-loop.md
├── rust/
│   └── ownership.md
└── devops/
    └── docker-network.md
```

- 기본 경로: `./til/{카테고리}/{주제슬러그}.md`
- 카테고리 폴더가 없으면 자동 생성
- 주제 슬러그: 영문 소문자, 하이픈 구분 (예: `event-loop`, `docker-network`)
- 날짜는 파일명이 아닌 frontmatter `date` 필드에 기록한다

## TIL 마크다운 템플릿

Obsidian의 기능(Properties, Wikilinks, Callouts)을 활용한 템플릿:

```markdown
---
date: YYYY-MM-DD
category: 카테고리
tags:
  - til
  - 태그1
  - 태그2
aliases:
  - "한글 제목"
  - "영문 제목"
---

# 제목

> [!tldr] 한줄 요약
> 핵심을 한 문장으로 요약

## 핵심 내용

학습한 핵심 개념을 설명한다. 필요하면 소제목으로 나눈다.

관련 개념이 vault에 있거나 앞으로 작성될 수 있으면 [[wikilink]]로 연결한다.

### 소제목 (필요시)

상세 설명...

## 예시

```언어
// 코드 예시 또는 실제 사례
```

> [!example] 실행 결과
> 코드 실행 결과나 동작 설명

## 참고 자료

- [자료 제목](URL)
- [자료 제목](URL)

## 관련 노트

- [[관련 TIL이나 노트가 있으면 링크]]
```

### 템플릿 작성 규칙

1. **Properties (frontmatter)**
   - `tags`에 항상 `til`을 포함한다
   - `aliases`에 한글/영문 제목을 넣어 검색이 쉽게 한다
   - `date`는 ISO 형식 (YYYY-MM-DD)

2. **Wikilinks `[[]]`**
   - 본문에서 관련 개념이 나오면 `[[개념]]` 형태로 링크한다
   - 아직 없는 노트여도 괜찮다 (Obsidian에서 나중에 생성 가능)
   - 예: "JavaScript의 [[클로저(Closure)]]는 [[렉시컬 스코프]]를 기억한다"

3. **Callouts**
   - 한줄 요약: `> [!tldr]` 사용
   - 코드 실행 결과: `> [!example]` 사용
   - 주의사항: `> [!warning]` 사용
   - 팁: `> [!tip]` 사용

4. **Mermaid 다이어그램**
   - 텍스트만으로 설명하기 어려운 구조나 흐름이 있을 때만 사용한다
   - 단순 나열, 설정 방법, 개념 정의 등은 텍스트로 충분하므로 mermaid를 쓰지 않는다
   - 하나의 TIL에 mermaid는 최대 1개를 권장한다
   - 다이어그램은 설명하는 내용 바로 아래에 배치한다

5. **태그**
   - frontmatter의 `tags`로 관리 (Obsidian이 자동 인식)
   - 카테고리명도 태그에 포함 (예: `javascript`, `devops`)

## Daily 노트 연동

TIL 저장 시 해당 날짜의 Daily 노트(`./Daily/YYYY-MM-DD.md`)에 카테고리별로 그룹핑하여 링크를 추가한다:

```markdown
## TIL

### javascript
- [[til/javascript/closure|클로저(Closure)]]
- [[til/javascript/event-loop|이벤트 루프(Event Loop)]]

### devops
- [[til/devops/docker-network|Docker 네트워크]]
```

- 카테고리 소제목(`### 카테고리`)으로 그룹핑한다
- Daily 노트가 이미 있으면:
  - `## TIL` 섹션이 있으면 해당 카테고리 소제목(`### 카테고리`)을 찾아 항목 추가
  - 해당 카테고리 소제목이 없으면 새로 만들어서 항목 추가
  - `## TIL` 섹션 자체가 없으면 파일 끝에 섹션과 카테고리 소제목 추가
- Daily 노트가 없으면: 새로 생성하고 TIL 섹션과 카테고리 소제목을 작성
- 카테고리 소제목 순서: 기존에 있는 순서를 유지하고, 새 카테고리는 마지막에 추가

## TIL MOC (Map of Content)

`./til/TIL MOC.md` 파일로 전체 TIL 목록을 관리한다. README.md 대신 Obsidian의 MOC 패턴을 사용한다:

```markdown
---
tags:
  - moc
  - til
---

# TIL (Today I Learned)

## 카테고리

### javascript
- [[til/javascript/closure|클로저(Closure)]]
- [[til/javascript/event-loop|이벤트 루프(Event Loop)]]

### devops
- [[til/devops/docker-network|Docker 네트워크]]
```

TIL 파일 저장 후 MOC에 해당 항목을 추가한다. MOC가 없으면 새로 생성한다.

## 인수 처리

- **첫 번째 인수**: 학습 주제 (필수)
  - 예: "JavaScript 클로저", "Docker 네트워크", "Rust ownership"
- **두 번째 인수**: 카테고리 (선택)
  - 예: "javascript", "devops", "rust"
  - 미지정 시 주제에서 자동 추론

## 실행 예시

```
/til JavaScript 클로저
/til Docker 네트워크 모드 devops
/til Rust의 소유권 개념
```

## 주의사항

- Phase 2(대화형 학습)에서 사용자가 원하면 바로 Phase 3으로 건너뛸 수 있다
- 리서치 결과가 부족하면 사용자에게 알리고 추가 키워드를 요청한다
- 한국어로 작성하되, 기술 용어는 원어 병기 (예: "클로저(Closure)")
- Wikilink 대상은 vault 내 기존 노트를 우선으로 하되, 없어도 생성한다 (Obsidian의 미생성 링크 활용)

## 피해야 할 실패 모드

- **사용자 동의 없이 저장**: "저장해줘"라고 말하기 전에 Phase 3으로 넘어가지 않는다
- **Phase 2 건너뛰기**: 리서치 결과만 보여주고 바로 저장하지 않는다. 사용자가 명시적으로 건너뛰기를 요청한 경우만 예외
- **Daily/MOC/백로그 누락**: TIL 파일만 저장하고 연동 파일 업데이트를 빠뜨리는 것이 가장 흔한 실수
- **MOC 번호 오류**: 기존 마지막 번호를 확인하지 않고 번호를 매기면 중복/건너뛰기 발생
- **기존 슬러그 충돌**: 같은 슬러그의 파일이 이미 있는지 확인하지 않고 덮어쓰기
- **얕은 내용**: Phase 2에서 충분한 대화 없이 피상적인 TIL을 생성
- **민감 정보 노출**: Phase 2 대화에서 나온 개인정보, 회사 내부 URL, API 키, 실제 서버 주소 등을 Phase 3 문서에 그대로 포함하지 않는다. 예시에는 `example.com`, `your-api-key`, `192.168.x.x` 같은 대체값을 사용한다

## 완료 체크리스트 (Phase 3)

Phase 3 저장 시 아래 항목을 모두 확인한다:

- [ ] TIL 파일이 템플릿 형식(frontmatter, tldr, 핵심 내용, 예시, 참고 자료, 관련 노트)에 맞게 저장됨
- [ ] Daily 노트(`./Daily/YYYY-MM-DD.md`)에 카테고리별 링크 추가됨
- [ ] TIL MOC(`./til/TIL MOC.md`)에 올바른 번호로 항목 추가됨
- [ ] 해당 카테고리 백로그에 항목이 있으면 `[x]`로 체크하고 wikilink를 경로 기반으로 업데이트
- [ ] 사용자에게 저장된 파일 경로를 안내함
