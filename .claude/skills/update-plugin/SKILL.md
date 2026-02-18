---
name: update-plugin
description: "설치된 Claude TIL 플러그인을 최신 버전으로 업데이트합니다"
argument-hint: "<vault-path>"
---

# Update Plugin Skill

이미 설치된 Claude TIL 플러그인을 최신 소스로 업데이트합니다.

## 활성화 조건

- `/update-plugin <vault-path>`
- "플러그인 업데이트해줘"

## 인수 처리

- **첫 번째 인수**: Obsidian vault 경로 (필수)
  - 예: `~/workspace/my-vault`, `/Users/name/Documents/obsidian-vault`

## 업데이트 절차

### 1. 사전 검증

```bash
# vault 경로 + 기존 설치 검증
ls <vault-path>/.obsidian/plugins/claude-til/manifest.json
```

플러그인이 설치되어 있지 않으면 `/install-plugin`을 사용하라고 안내하고 중단한다.

### 2. 최신 소스 가져오기

```bash
git pull origin main
```

충돌이 발생하면 사용자에게 알린다.

### 3. 의존성 업데이트 + 빌드

```bash
npm install
npm run build
```

### 4. 에셋 교체

```bash
PLUGIN_DIR="<vault-path>/.obsidian/plugins/claude-til"
cp main.js "$PLUGIN_DIR/main.js"
cp manifest.json "$PLUGIN_DIR/manifest.json"
cp styles.css "$PLUGIN_DIR/styles.css"
```

### 5. node-pty 재빌드 (필요 시)

`node_modules/node-pty`가 이미 있으면 재빌드만 실행한다. 없으면 `/install-plugin`의 5~6단계를 수행한다.

Electron 버전 감지는 `/install-plugin`과 동일한 방법을 사용한다.

```bash
npx @electron/rebuild -m "$PLUGIN_DIR/node_modules/node-pty" -v <감지된-electron-version>
```

### 6. 스킬/규칙 강제 재설치 (선택)

사용자에게 스킬/규칙도 최신 버전으로 갱신할지 묻는다. 원하면:

```bash
# plugin-version이 있는 스킬 파일 삭제 → 다음 플러그인 로드 시 재설치
SKILLS_DIR="<vault-path>/.claude/skills"
for skill in til backlog research save; do
  SKILL_FILE="$SKILLS_DIR/$skill/SKILL.md"
  if [ -f "$SKILL_FILE" ] && grep -q "plugin-version:" "$SKILL_FILE"; then
    rm "$SKILL_FILE"
  fi
done
```

### 7. 완료 안내

```
업데이트 완료!

Obsidian을 재시작하거나 플러그인을 다시 로드하세요.
```

## 주의사항

- 이 스킬은 프로젝트 루트 디렉토리에서 실행해야 한다
- 에셋(main.js, manifest.json, styles.css)만 교체하므로 사용자 설정은 유지된다
- node-pty 재빌드는 Obsidian의 Electron 버전이 변경되었을 때만 필요하지만, 안전을 위해 항상 실행한다
