---
name: install-plugin
description: "Obsidian vault에 Claude TIL 플러그인을 설치합니다"
argument-hint: "<vault-path>"
---

# Install Plugin Skill

Claude TIL 플러그인을 Obsidian vault에 설치합니다.

## 활성화 조건

- `/install-plugin <vault-path>`
- "플러그인 설치해줘"

## 인수 처리

- **첫 번째 인수**: Obsidian vault 경로 (필수)
  - 예: `~/workspace/my-vault`, `/Users/name/Documents/obsidian-vault`
  - vault 경로에 `.obsidian` 폴더가 있는지 검증

## 설치 절차

아래 단계를 순서대로 실행한다. 각 단계에서 오류가 발생하면 중단하고 사용자에게 알린다.

### 1. 사전 검증

```bash
# vault 경로 검증
ls <vault-path>/.obsidian

# Node.js 설치 확인
node --version   # 18 이상 필요

# npm 설치 확인
npm --version
```

vault 경로가 유효하지 않거나 Node.js가 없으면 안내 메시지를 출력하고 중단한다.

### 2. 의존성 설치

프로젝트 루트에서:

```bash
npm install
```

### 3. 프로덕션 빌드

```bash
npm run build
```

### 4. 플러그인 에셋 복사

```bash
PLUGIN_DIR="<vault-path>/.obsidian/plugins/claude-til"
mkdir -p "$PLUGIN_DIR"
cp main.js "$PLUGIN_DIR/main.js"
cp manifest.json "$PLUGIN_DIR/manifest.json"
cp styles.css "$PLUGIN_DIR/styles.css"
```

### 5. 네이티브 모듈 설치

플러그인 폴더에 `package.json`을 생성하고 node-pty를 설치한다:

```bash
cd "$PLUGIN_DIR"
```

`$PLUGIN_DIR/package.json` 내용:

```json
{
  "name": "claude-til",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "dependencies": {
    "ajv": "^8.18.0",
    "ajv-formats": "^3.0.1",
    "node-pty": "^1.1.0"
  }
}
```

```bash
npm install --production
```

### 6. Electron 버전 감지 + node-pty 재빌드

Obsidian이 사용하는 Electron 버전을 감지하여 node-pty를 재빌드한다.

**감지 방법** (우선순위 순):

1. 환경변수 `ELECTRON_VERSION`이 설정되어 있으면 사용
2. Obsidian 실행 파일에서 Electron 버전 추출 시도:
   - macOS: `/Applications/Obsidian.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/Info.plist`에서 `CFBundleVersion` 읽기
   - 또는 `strings /Applications/Obsidian.app/Contents/Frameworks/Electron\ Framework.framework/Electron\ Framework | grep "Chrome/" | head -1`에서 Electron 버전 추출
3. Obsidian의 `package.json` 또는 `electron` 바이너리에서 버전 확인
4. 위 방법이 모두 실패하면 사용자에게 Electron 버전을 직접 물어본다

감지한 버전으로 재빌드:

```bash
npx @electron/rebuild -m "$PLUGIN_DIR/node_modules/node-pty" -v <감지된-electron-version>
```

### 7. 완료 안내

설치 완료 후 사용자에게 안내:

```
설치 완료!

1. Obsidian을 재시작하세요
2. 설정 > Community plugins에서 "Claude TIL"을 활성화하세요
3. (선택) MCP 서버 연결:
   claude mcp add --transport http claude-til http://localhost:22360/mcp
```

## 주의사항

- 이 스킬은 프로젝트 루트 디렉토리에서 실행해야 한다 (`package.json`이 있는 위치)
- Electron 버전 감지에 실패하면 사용자에게 Obsidian 개발자 도구(Ctrl+Shift+I)에서 `process.versions.electron`을 확인하도록 안내한다
- 기존 설치가 있으면 덮어쓴다 (에셋만 교체, node_modules는 유지)
