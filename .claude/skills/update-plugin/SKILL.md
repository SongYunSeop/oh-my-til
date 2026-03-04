---
name: update-plugin
description: "Update the installed Oh My TIL plugin to the latest version"
argument-hint: "<vault-path>"
---

# Update Plugin Skill

Update the already-installed Oh My TIL plugin to the latest source.

## Activation

- `/update-plugin <vault-path>`
- "update the plugin"

## Argument Handling

- **First argument**: Obsidian vault path (required)
  - Examples: `~/workspace/my-vault`, `/Users/name/Documents/obsidian-vault`

## Update Procedure

### 1. Pre-flight Validation

```bash
# Verify vault path + existing installation
ls <vault-path>/.obsidian/plugins/oh-my-til/manifest.json
```

If the plugin is not installed, advise the user to use `/install-plugin` and abort.

### 2. Fetch Latest Source

```bash
# Verify the current branch is main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "[ERROR] Current branch is not main: $CURRENT_BRANCH"
  echo "Please run from the main branch: git checkout main"
  exit 1
fi

git pull origin main
```

If the current branch is not `main`, notify the user and abort. Notify the user if conflicts occur.

### 3. Deploy

Always include skills/rules in the deployment (`plugin-version` frontmatter automatically protects user-customized files).

```bash
npm run deploy -- --refresh-skills <vault-path>
```

The deploy script handles build, asset copying, node-pty rebuild (only when the Electron version changes), and skills/rules reinstall automatically.

### 4. Completion Notice

```
Update complete!

Restart Obsidian or reload the plugin.
```

## Notes

- This skill must be run from the project root directory
- Only assets (main.js, manifest.json, styles.css) are replaced, so user settings are preserved
- node-pty rebuild runs only when the Electron version has changed (tracked via the `.electron-version` file)
