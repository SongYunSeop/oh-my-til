#!/bin/bash
# Oh My TIL — Session memory save hook
# Saves learning context at session end for continuity across sessions

TIL_PATH="${OH_MY_TIL_PATH:-til}"
MEMORY_FILE=".claude/til-session.json"

# Check if TIL directory exists
if [ ! -d "$TIL_PATH" ]; then
  exit 0
fi

# Find TIL files modified in the last 2 hours
recent_files=()
while IFS= read -r f; do
  [ -n "$f" ] && recent_files+=("$f")
done < <(find "$TIL_PATH" -name "*.md" -not -name "backlog.md" -mmin -120 2>/dev/null | head -20)

if [ ${#recent_files[@]} -eq 0 ]; then
  exit 0
fi

# Build session context JSON
{
  printf '{\n'
  printf '  "savedAt": "%s",\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '  "tilPath": "%s",\n' "$TIL_PATH"
  printf '  "recentTils": [\n'
  first=true
  for f in "${recent_files[@]}"; do
    title=$(grep -m1 "^# " "$f" 2>/dev/null | sed 's/^# //')
    category=$(echo "$f" | sed "s|^$TIL_PATH/||" | cut -d'/' -f1)
    if [ "$first" = true ]; then first=false; else printf ',\n'; fi
    title=$(echo "$title" | sed 's/"/\\"/g')
    printf '    {"path": "%s", "title": "%s", "category": "%s"}' "$f" "$title" "$category"
  done
  printf '\n  ]\n'
  printf '}\n'
} > "$MEMORY_FILE"
