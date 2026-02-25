#!/bin/bash
# Oh My TIL — Session memory load hook
# Injects previous session's learning context at session start

MEMORY_FILE=".claude/til-session.json"

if [ ! -f "$MEMORY_FILE" ]; then
  exit 0
fi

# Check file age (skip if older than 7 days)
if [[ "$OSTYPE" == "darwin"* ]]; then
  file_age=$(( ($(date +%s) - $(stat -f %m "$MEMORY_FILE")) / 86400 ))
else
  file_age=$(( ($(date +%s) - $(stat -c %Y "$MEMORY_FILE")) / 86400 ))
fi

if [ "$file_age" -gt 7 ]; then
  rm -f "$MEMORY_FILE"
  exit 0
fi

# Extract saved timestamp
saved_at=$(grep -o '"savedAt": "[^"]*"' "$MEMORY_FILE" | head -1 | cut -d'"' -f4)

echo "📚 이전 학습 세션 컨텍스트 (${saved_at}):"
echo ""
echo "최근 작업한 TIL:"

# Parse recent TILs (without jq dependency)
grep -o '"path": "[^"]*"' "$MEMORY_FILE" | while IFS= read -r line; do
  path=$(echo "$line" | cut -d'"' -f4)
  if [ -f "$path" ]; then
    title=$(grep -m1 "^# " "$path" 2>/dev/null | sed 's/^# //')
    if [ -n "$title" ]; then
      echo "  - $title ($path)"
    else
      echo "  - $path"
    fi
  else
    echo "  - $path (삭제됨)"
  fi
done

echo ""
echo "이전 세션에서 이어서 작업하려면 해당 파일을 참조하세요."
