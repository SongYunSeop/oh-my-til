---
name: til-lint
description: "Health-check the TIL wiki for structural issues. Use when the user says 'lint', 'check my TILs', 'wiki health', 'find broken links', 'orphan notes', or wants a periodic quality audit of their TIL collection."
argument-hint: "[category]"
plugin-version: "__PLUGIN_VERSION__"
---

# TIL Lint Skill

Scan the TIL collection for structural issues and suggest fixes. Diagnose, don't auto-fix.

## MCP Tools

- `til_list`: Full TIL inventory (category grouping, search)
- `til_get_context`: Link relationships, unresolved mentions for a topic
- `til_backlog_status`: Backlog progress per category (with sections when filtered)
- `til_recent_context`: Recent activity (mtime-based)
- `til_review_list`: SRS review stats (total tracked, due today)
- `til_backlog_check`: Mark backlog item as completed (used in fix actions)
- `til_review_update`: Record review result or register for SRS (used in fix actions)

## Step 1: Collect Inventory

1. Call `til_list` (no filters) to get all TILs and categories
2. Call `til_backlog_status` to get all backlog progress
3. Call `til_review_list` (`include_content: false`) to get SRS stats
4. Use `Glob` with pattern `raw/**/*.md` to list all raw source files
5. If category argument provided, repeat above calls with category filter

## Step 2: Run Checks

Perform all checks below. For each issue found, record category, file path, and issue type.

### Check 1: Frontmatter Validation

Read each TIL file and verify:
- Required fields present: `title`, `date`, `category`, `tags`, `aliases`
- `tags` array includes `"til"`
- `date` is valid ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)

### Check 2: Orphan TILs

For each TIL, call `til_get_context` with the filename slug as topic.
Flag TILs where: matchedFiles backlinks count = 0 AND file is not in TIL MOC.

Read `til/TIL MOC.md` and cross-reference with the full TIL list.
- TILs not listed in MOC
- MOC entries pointing to non-existent files

### Check 3: Broken and Unresolved Links

From `til_get_context` results, collect:
- `unresolvedMentions`: links pointing to files that don't exist
- Group by source file for the report

### Check 4: Backlog Consistency

Compare `til_backlog_status` sections with `til_list`:
- Backlog item marked `[x]` but no corresponding TIL file exists
- TIL file exists but backlog item still marked `[ ]`

### Check 5: SRS Coverage

Compare total TIL count (`til_list`) with SRS tracked count (`til_review_list` stats).
- Flag TILs not registered for spaced repetition review
- Report coverage percentage

### Check 6: Stale Content

Call `til_recent_context` with `days: 180`.
- TILs NOT in the recent list = older than 6 months without modification
- Prioritize categories with fast-changing topics (framework, tool, library)

### Check 7: Raw Source Coverage

Scan all TIL files for `## References` sections containing `raw/` paths.
Compare with the full raw file inventory from Step 1.

- **Unprocessed raw**: Files in `raw/` not referenced by any TIL's References section
- **Broken raw reference**: TIL References contains a `raw/` path but the file doesn't exist

## Step 3: Generate Report

Present findings grouped by severity:

```
## TIL Lint Report

### Errors (must fix)
- Broken links (N)
- Missing required frontmatter (N)
- Backlog mismatches (N)
- Broken raw references (N)

### Warnings (should fix)
- Orphan TILs — no inbound links (N)
- Not in MOC (N)
- Not registered for SRS (N)

### Info
- Stale TILs — 6+ months without update (N)
- SRS coverage: X%
- Unprocessed raw sources (N)
- Raw sources total: N files
- Total: N TILs across M categories
```

List individual issues under each section with file paths.

## Step 4: Suggest Actions

Ask the user via `AskUserQuestion`:
- "Which issues would you like to fix now?"
- Options: "Fix errors first" / "Fix all" / "Pick specific issues" / "Just the report is enough"

If the user chooses to fix:
- Frontmatter issues: Edit files directly to add missing fields
- MOC gaps: Edit `til/TIL MOC.md` to add missing entries
- Backlog mismatches: Use `til_backlog_check` to sync check state
- SRS registration: Use `til_review_update` (action: "review", grade: 4) per file
- Broken links / orphans / stale: Suggest specific actions, don't auto-fix (requires user judgment)
- Unprocessed raw: Suggest running `/til` on the topic to create a TIL from the raw source
- Broken raw references: Remove dead raw links from TIL References section

## Rules

- Read-only by default. Only modify files after explicit user consent in Step 4.
- Do not judge content quality. This skill checks structure, not writing.
- Batch MCP calls where possible to minimize round-trips.
- If category argument is provided, scope all checks to that category only.
- Keep the report concise. For large issue lists (>20), show top items and summarize the rest.
