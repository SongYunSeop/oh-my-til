---
name: install-plugin
description: "Install the Oh My TIL plugin into an Obsidian vault"
argument-hint: "<vault-path>"
---

# Install Plugin Skill

Install the Oh My TIL plugin into an Obsidian vault.

## Activation

- `/install-plugin <vault-path>`
- "install the plugin"

## Argument Handling

- **First argument**: Obsidian vault path (required)
  - Examples: `~/workspace/my-vault`, `/Users/name/Documents/obsidian-vault`
  - Validate that the vault path contains a `.obsidian` folder

## Installation Procedure

Execute the steps below in order. If an error occurs at any step, abort and notify the user.

### 1. Pre-flight Validation

```bash
# Validate vault path
ls <vault-path>/.obsidian

# Check Node.js installation
node --version   # requires 18 or higher

# Check npm installation
npm --version
```

If the vault path is invalid or Node.js is missing, print a guidance message and abort.

### 2. Install Dependencies

From the project root:

```bash
npm install
```

### 3. Deploy

Run the deploy script. It handles build, asset copying, native module installation, and node-pty rebuild automatically.

```bash
npm run deploy -- <vault-path>
```

### 4. Completion Notice

After installation completes, notify the user:

```
Installation complete!

1. Restart Obsidian
2. Enable "Oh My TIL" under Settings > Community plugins
3. (Optional) Connect the MCP server:
   claude mcp add --transport http oh-my-til http://localhost:22360/mcp
```

## Notes

- This skill must be run from the project root directory (where `package.json` is located)
- If Electron version detection fails, advise the user to check `process.versions.electron` in Obsidian developer tools (Ctrl+Shift+I)
- If an existing installation is present, it will be overwritten (assets only; node_modules are preserved)
