#!/bin/bash
set -euo pipefail

# Oh My TIL — Obsidian vault deployment script
# Usage: ./scripts/deploy.sh /path/to/vault
#   Example: ./scripts/deploy.sh ~/workspace/my-vault

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Electron version (the version Obsidian uses)
# Set the ELECTRON_VERSION env var, or auto-detect from macOS Obsidian
if [ -z "${ELECTRON_VERSION:-}" ]; then
  # macOS: auto-detect Electron version from Obsidian.app
  PLIST="/Applications/Obsidian.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources/Info.plist"
  if [ -f "$PLIST" ]; then
    ELECTRON_VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$PLIST" 2>/dev/null || true)
  fi

  if [ -z "${ELECTRON_VERSION:-}" ]; then
    echo "Error: Could not detect Electron version."
    echo "  Please set the ELECTRON_VERSION environment variable."
    echo "  Example: ELECTRON_VERSION=37.10.2 npm run deploy -- /path/to/vault"
    echo ""
    echo "  Check in Obsidian developer tools (Ctrl+Shift+I):"
    echo "    process.versions.electron"
    exit 1
  fi
  echo "    Auto-detected Electron version: ${ELECTRON_VERSION}"
fi

# ── Option parsing ──────────────────────────────────────────────

REFRESH_SKILLS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --refresh-skills)
      REFRESH_SKILLS=true
      shift
      ;;
    -*)
      echo "Unknown option: $1"
      echo "Usage: $0 [--refresh-skills] <vault-path>"
      exit 1
      ;;
    *)
      break
      ;;
  esac
done

if [ $# -lt 1 ]; then
  echo "Usage: $0 [--refresh-skills] <vault-path>"
  echo "  Example: $0 ~/workspace/my-vault"
  echo "  Option: --refresh-skills  Force reinstall skills/rules in the vault"
  exit 1
fi

VAULT_PATH="$1"

if [ ! -d "$VAULT_PATH/.obsidian" ]; then
  echo "Error: '$VAULT_PATH' is not an Obsidian vault (no .obsidian folder)"
  exit 1
fi

PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/oh-my-til"

# ── 1. Build ───────────────────────────────────────────────

echo "==> Building plugin..."
cd "$PROJECT_DIR"
npm run build

# ── 2. Create plugin directory + copy assets ─────────────────

echo "==> Copying plugin assets..."
mkdir -p "$PLUGIN_DIR"

cp "$PROJECT_DIR/main.js" "$PLUGIN_DIR/main.js"
cp "$PROJECT_DIR/manifest.json" "$PLUGIN_DIR/manifest.json"
cp "$PROJECT_DIR/styles.css" "$PLUGIN_DIR/styles.css"
cp "$PROJECT_DIR/migrate-links.mjs" "$PLUGIN_DIR/migrate-links.mjs"

# ── 3. Install native dependencies ────────────────────────────

echo "==> Installing native modules..."

# Create package.json in the plugin folder if it doesn't exist
if [ ! -f "$PLUGIN_DIR/package.json" ]; then
  cat > "$PLUGIN_DIR/package.json" << 'EOF'
{
  "name": "oh-my-til",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "dependencies": {
    "ajv": "^8.18.0",
    "ajv-formats": "^3.0.1",
    "node-pty": "^1.1.0"
  }
}
EOF
fi

cd "$PLUGIN_DIR"
npm install --production 2>&1

# ── 4. Rebuild node-pty for Electron (only when version changes) ──────────

ELECTRON_VERSION_FILE="$PLUGIN_DIR/.electron-version"
LAST_ELECTRON_VERSION=""
if [ -f "$ELECTRON_VERSION_FILE" ]; then
  LAST_ELECTRON_VERSION=$(cat "$ELECTRON_VERSION_FILE")
fi

if [ "$LAST_ELECTRON_VERSION" = "$ELECTRON_VERSION" ]; then
  echo "==> Skipping node-pty rebuild (Electron ${ELECTRON_VERSION} unchanged)"
else
  echo "==> Rebuilding node-pty for Electron ${ELECTRON_VERSION}..."
  cd "$PROJECT_DIR"
  npx @electron/rebuild -m "$PLUGIN_DIR/node_modules/node-pty" -v "$ELECTRON_VERSION" 2>&1
  echo "$ELECTRON_VERSION" > "$ELECTRON_VERSION_FILE"
fi

# ── 5. Force reinstall skills/rules (optional) ─────────────────────────

if [ "$REFRESH_SKILLS" = true ]; then
  echo "==> Force reinstalling skills/rules..."
  SKILLS_DIR="$VAULT_PATH/.claude/skills"
  RULES_DIR="$VAULT_PATH/.claude/rules"
  ASSETS_DIR="$PROJECT_DIR"
  PLUGIN_VERSION=$(node -p "require('$PROJECT_DIR/manifest.json').version")

  # Delete existing plugin-managed skills (only files with plugin-version)
  if [ -d "$SKILLS_DIR" ]; then
    find "$SKILLS_DIR" -name "SKILL.md" -type f | while read -r SKILL_FILE; do
      if grep -q "plugin-version:" "$SKILL_FILE"; then
        rm "$SKILL_FILE"
        echo "    Removed: $SKILL_FILE"
      fi
    done
  fi

  # Delete existing plugin-managed rules
  if [ -d "$RULES_DIR" ]; then
    find "$RULES_DIR" -name "*.md" -type f | while read -r RULE_FILE; do
      if grep -q "plugin-version:" "$RULE_FILE"; then
        rm "$RULE_FILE"
        echo "    Removed: $RULE_FILE"
      fi
    done
  fi

  # Install skills
  for SKILL_SRC in "$ASSETS_DIR"/skills/*/SKILL.md; do
    SKILL_NAME=$(basename "$(dirname "$SKILL_SRC")")
    DEST_DIR="$SKILLS_DIR/$SKILL_NAME"
    mkdir -p "$DEST_DIR"
    sed "s/__PLUGIN_VERSION__/$PLUGIN_VERSION/g" "$SKILL_SRC" > "$DEST_DIR/SKILL.md"
    echo "    Installed: $DEST_DIR/SKILL.md"
  done

  # Install latest rules from rules/ (only if directory exists)
  if [ -d "$ASSETS_DIR/rules" ]; then
    for RULE_SRC in "$ASSETS_DIR"/rules/*.md; do
      [ -f "$RULE_SRC" ] || continue
      RULE_NAME=$(basename "$RULE_SRC")
      mkdir -p "$RULES_DIR"
      sed "s/__PLUGIN_VERSION__/$PLUGIN_VERSION/g" "$RULE_SRC" > "$RULES_DIR/$RULE_NAME"
      echo "    Installed: $RULES_DIR/$RULE_NAME"
    done
  fi

  # Delete existing plugin-managed agents
  AGENTS_DIR="$VAULT_PATH/.claude/agents"
  if [ -d "$AGENTS_DIR" ]; then
    find "$AGENTS_DIR" -name "*.md" -type f | while read -r AGENT_FILE; do
      if grep -q "plugin-version:" "$AGENT_FILE"; then
        rm "$AGENT_FILE"
        echo "    Removed: $AGENT_FILE"
      fi
    done
  fi

  # Install latest agents from agents/ (only if directory exists)
  if [ -d "$ASSETS_DIR/agents" ]; then
    for AGENT_SRC in "$ASSETS_DIR"/agents/*.md; do
      [ -f "$AGENT_SRC" ] || continue
      AGENT_NAME=$(basename "$AGENT_SRC")
      mkdir -p "$AGENTS_DIR"
      sed "s/__PLUGIN_VERSION__/$PLUGIN_VERSION/g" "$AGENT_SRC" > "$AGENTS_DIR/$AGENT_NAME"
      echo "    Installed: $AGENTS_DIR/$AGENT_NAME"
    done
  fi

  echo "    Skills/rules/agents reinstall complete."
fi

# ── Done ───────────────────────────────────────────────────

echo ""
echo "==> Deployment complete!"
echo "    Location: $PLUGIN_DIR"
echo "    Restart Obsidian or reload the plugin."
