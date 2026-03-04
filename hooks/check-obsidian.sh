#!/bin/bash
# Oh My TIL — SessionStart hook: detect Obsidian vault and suggest plugin setup

# Skip if not in an Obsidian vault
[ ! -d ".obsidian" ] && exit 0

# Skip if oh-my-til plugin is already installed
[ -d ".obsidian/plugins/oh-my-til" ] && exit 0

echo "Obsidian vault detected but oh-my-til plugin is not installed."
echo "To use terminal embedding, file watcher, and dashboard, run /oh-my-til:setup-obsidian"
