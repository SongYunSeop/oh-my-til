## Learning Workflow

1. `/research <topic>` — Research → Generate backlog
2. `/backlog [category]` — Check backlog progress
3. `/til <topic>` — Research → Interactive learning → Save
4. `/save` — Save TIL (auto-update Daily/MOC/backlog)
5. `/til-review [category]` — SRS-based spaced repetition review

## MCP Tools

**Learning Context:**
- `til_get_context` — Find existing TILs related to a topic (searches file paths, content, backlinks, and unresolved links)
- `til_recent_context` — Recent learning activity (newest first)

**TIL Management:**
- `til_list` — TIL list + category grouping (search filter)
- `til_save_note` — Save TIL (ensures valid frontmatter; set auto_check_backlog to auto-mark backlog items)

**Backlog:**
- `til_backlog_status` — Backlog progress
- `til_backlog_check` — Mark backlog item as completed (standalone use)

**Review (SRS):**
- `til_review_list` — Review card list + stats (include_content)
- `til_review_update` — Record review result

**Stats:**
- `til_dashboard` — Learning dashboard stats
