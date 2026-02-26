---
name: setup-pages
description: "GitHub Pages 배포 설정 — 워크플로우 생성 및 배포 안내"
plugin-version: "__PLUGIN_VERSION__"
---

# Setup Pages Skill

TIL 정적 사이트를 GitHub Pages로 자동 배포하는 워크플로우를 설정한다.

## 활성화 조건

- "/setup-pages"
- "GitHub Pages 설정", "페이지 배포 설정", "배포 설정"

## 비활성화 조건

- 정적 사이트를 생성만 하고 배포는 안 할 때 → `npx oh-my-til deploy` 직접 실행
- 이미 설정이 완료된 상태에서 사이트를 생성할 때 → `npx oh-my-til deploy` 직접 실행

## 워크플로우

### Step 1: 사전 확인

1. `.git/` 디렉토리 존재 여부 확인
   - 없으면: "이 디렉토리는 git 저장소가 아닙니다. `git init`으로 초기화한 후 다시 시도해주세요." 안내 후 종료
2. `.github/workflows/deploy-til.yml` 존재 여부 확인
   - 있으면: 기존 내용을 표시하고, 수정이 필요한지 사용자에게 질문. 수정 불필요하면 Step 4로 건너뛴다.

### Step 2: 배포 설정 확인

`oh-my-til.json` 파일을 확인한다. 없거나 `deploy` 섹션이 없으면 사용자에게 질문하여 설정한다:

```
? 사이트 제목 (기본값: TIL):
? 부제목 (선택, Enter로 건너뛰기):
? GitHub 프로필 URL (선택, 예: https://github.com/username):
```

사용자 응답을 바탕으로 `oh-my-til.json`을 생성하거나 기존 파일의 `deploy` 섹션을 업데이트한다:

```json
{
  "deploy": {
    "title": "사용자 입력값",
    "subtitle": "사용자 입력값 (선택)",
    "github": "사용자 입력값 (선택)"
  }
}
```

이미 `oh-my-til.json`에 `deploy` 설정이 있으면 현재 값을 보여주고, 변경할지 확인한다.

### Step 3: 워크플로우 파일 생성

`.github/workflows/deploy-til.yml` 파일을 아래 내용으로 생성한다:

```yaml
name: Deploy TIL to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Generate TIL site
        run: npx oh-my-til deploy .
      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### Step 4: 완료 안내

생성/확인한 파일 목록과 다음 단계를 안내한다:

```
✓ GitHub Pages 배포 설정 완료

생성된 파일:
  - .github/workflows/deploy-til.yml
  - oh-my-til.json (배포 설정)

다음 단계:
  1. GitHub 저장소 Settings → Pages → Source에서 "GitHub Actions"를 선택하세요
  2. 변경 사항을 커밋하고 push하면 자동으로 배포됩니다

     git add .github/workflows/deploy-til.yml oh-my-til.json
     git commit -m "ci: GitHub Pages 배포 워크플로우 추가"
     git push

배포 완료 후 사이트 주소: https://{username}.github.io/{repo}/
```

- `{username}`과 `{repo}`는 `git remote get-url origin`에서 추출하여 실제 값으로 대체한다
- remote URL을 가져올 수 없으면 일반적인 형식으로 안내한다

## 주의사항

- 한국어로 출력한다
- 워크플로우 YAML은 위 템플릿을 정확히 사용한다 (들여쓰기, 키 이름 변경 금지)
- `oh-my-til.json`의 기존 설정(`serve` 등)은 보존하고 `deploy` 섹션만 추가/수정한다
- 커밋은 하지 않는다. 사용자에게 커밋 명령어를 안내만 한다
