---
name: omt-setup
description: "oh-my-til unified setup — deployment configuration"
plugin-version: "__PLUGIN_VERSION__"
---

# OMT Setup Skill

Manage oh-my-til configuration in one place. Operates via subcommands.

## Subcommands

### `/omt-setup` (no arguments)

Read `oh-my-til.json`, display current configuration + subcommand guide:
- `deploy` — GitHub Pages deployment configuration

### `/omt-setup deploy`

Configure GitHub Pages deployment:
1. Check for `.git/` (if not found, notify and exit)
2. Check `.github/workflows/deploy-til.yml` (if exists, ask whether modification is needed)
3. Configure deploy section in `oh-my-til.json` (title, subtitle, GitHub URL)
4. Generate workflow YAML
5. Show completion guide (Settings → Pages → select GitHub Actions, commit & push commands)

## Rules

- Preserve existing settings in `oh-my-til.json`, only add/modify the relevant section
- Do not commit (only show the user the commands)
