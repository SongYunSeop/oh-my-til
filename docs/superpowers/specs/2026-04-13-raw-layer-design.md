# Raw Layer Design

Add a raw sources layer to oh-my-til, inspired by Karpathy's LLM Wiki architecture. Raw sources are immutable reference materials that TILs are synthesized from.

## Architecture

```
raw/{category}/{slug}.md    <- Immutable source documents
til/{category}/{slug}.md    <- LLM-generated TILs (references raw via sources field)
til/{category}/backlog.md   <- Learning plan (references raw paths + URLs)
CLAUDE.md + skills/         <- Schema layer
```

## Approach

Lightweight (skills + conventions only). No new MCP tools. Raw file management uses existing filesystem tools (Glob, Read, Write). MCP tools can be added later if raw collection grows large enough to need structured access.

## Raw File Convention

### Directory Structure

```
raw/{category}/{slug}.md
```

- Category names match `til/` naming (react, typescript, llm, etc.)
- Slug: lowercase with hyphens
- Files are immutable — never modified after creation

### Frontmatter Format

Web Clipper origin:
```yaml
---
title: "Article Title"
source: https://example.com/article
clipped: 2026-04-13
author: "Author Name"
tags:
  - react
  - server-components
---
```

`/research` auto-save origin:
```yaml
---
title: "Article Title"
source: https://example.com/article
fetched: 2026-04-13
tags:
  - react
  - server-components
---
```

Distinction: `clipped` (manual Web Clipper) vs `fetched` (automated /research).

## Collection Methods

### 1. Web Clipper (Manual)

User clips articles from browser. Obsidian Web Clipper template configured to save to `raw/{category}/` with the frontmatter format above.

### 2. /research Auto-Save (Automated)

During `/research`, WebFetch results are saved to `raw/{category}/{slug}.md` before organizing the backlog.

## Skill Changes

### /research

Add Phase 1.5 between Topic Research and Organize Backlog:

```
Phase 1: Topic Research (unchanged)
Phase 1.5: Save Raw Sources (new)
  - Save WebFetch content to raw/{category}/{slug}.md
  - Frontmatter: title, source, fetched, tags
Phase 2: Organize Backlog (modified)
  - sources field now includes raw file paths alongside URLs
```

Backlog `sources` field extension:
```yaml
sources:
  hooks: [raw/react/react-hooks-guide.md, https://react.dev/reference/hooks]
```

### /til

Modify Phase 1 source loading:

- Check backlog sourceUrls
- If path starts with `raw/`: Read local file (fast, reliable)
- If URL: WebFetch as before (backward compatible)

### /save

Add raw source links to the TIL body's `## References` section:

```markdown
## References
- [Source Title](raw/{category}/{slug}.md) ([original](https://url))
- [Title](URL)
```

When a TIL is created from raw sources, include links to the raw files in the References section. Include original URLs alongside raw paths when available. Optional — TILs created without raw sources omit raw links.

### /til-lint

Two new checks:

1. **Unprocessed raw**: Files in `raw/` not referenced by any TIL's `## References` section
2. **Broken raw reference**: TIL `## References` contains a `raw/` path but the file doesn't exist

## Tracking: TIL references raw (one-directional)

- TIL body `## References` section contains links to raw files: `[Title](raw/{category}/{slug}.md)`
- Raw files are never modified (immutable)
- Reverse lookup (raw -> TIL) is computed dynamically by scanning all TIL References sections (lint, dashboard, etc.)

## Backward Compatibility

- Raw layer is opt-in. Existing TILs without `sources` continue to work
- `/til` skill falls back to WebFetch when no raw file exists
- Backlog `sources` accepts both raw paths and URLs
- No MCP tool changes required

## Future Expansion (not in scope)

- `til_raw_list` / `til_raw_save` MCP tools (when raw collection grows large)
- Dashboard raw statistics (total sources, unprocessed count)
- Obsidian Web Clipper template auto-configuration in `/omt-setup`
