---
description: "새 버전을 릴리즈합니다. 버전 범프 → 테스트 → 빌드 → 태그 → GitHub Release"
argument-hint: "[patch|minor|major]"
allowed-tools: Read, Edit, Bash(npm *), Bash(git *), Bash(gh *)
disable-model-invocation: true
---

# Create GitHub Release

새 버전을 릴리즈합니다.

## 인자

$ARGUMENTS에서 bump 타입을 추출합니다: `patch`, `minor`, `major` (기본: `patch`).
숫자 버전(예: `0.2.0`)이 직접 주어지면 그 버전을 사용합니다.
인자가 없으면 `patch` bump을 적용합니다.

## 사전 검증

1. working tree가 clean한지 확인 (`git status --porcelain`). uncommitted changes가 있으면 중단
2. 현재 브랜치가 `main`인지 확인. 아니면 중단
3. `gh` CLI가 설치되어 있는지 확인. 없으면 중단

## 버전 결정

- `manifest.json`에서 현재 버전을 읽는다
- bump 타입에 따라 semver 계산:
  - `patch`: 0.1.3 → 0.1.4
  - `minor`: 0.1.3 → 0.2.0
  - `major`: 0.1.3 → 1.0.0
- 계산된 새 버전을 사용자에게 확인받는다

## 절차

1. `npm test`로 테스트 통과 확인
2. `npm run build`로 프로덕션 빌드 확인
3. 아래 **6개 파일**의 버전을 새 버전으로 업데이트:
   - `package.json` → `"version"`
   - `manifest.json` → `"version"`
   - `versions.json` → 새 버전 항목 추가 (minAppVersion은 manifest.json에서 읽기)
   - `skills/til/SKILL.md` → `plugin-version` frontmatter
   - `skills/backlog/SKILL.md` → `plugin-version` frontmatter
   - `skills/research/SKILL.md` → `plugin-version` frontmatter
4. 변경사항을 커밋: `🔖 chore: release v{version}`
5. 태그 생성: `git tag v{version}`
6. 푸시: `git push origin main --tags`
7. GitHub Release 생성:
   ```
   gh release create v{version} main.js manifest.json styles.css --title "v{version}" --generate-notes
   ```

에셋은 반드시 `main.js`, `manifest.json`, `styles.css` 세 파일입니다.
