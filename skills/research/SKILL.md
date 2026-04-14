---
name: research
description: "Research a topic to identify key concepts and terms, then organize as a learning backlog. Use when the user wants a learning roadmap, study plan, curriculum, or asks 'what should I learn about X' — focuses on planning what to learn, not learning itself."
argument-hint: "<topic> [category]"
plugin-version: "__PLUGIN_VERSION__"
---

# Research Skill

Topic research → Identify concepts and dependencies → Save backlog file.

## MCP Tools

- `til_list`: Check existing TILs (search by topic using the search parameter)

## Phase 1: Topic Research

1. Use `til_list(search=topic)` to check already-learned topics → avoid duplicate backlog entries
2. Research the topic via web search, identify required concepts, terms, and prerequisites
3. Break down into subtopics and research each directly
4. Analyze dependencies between subtopics

## Phase 1.5: Save Raw Sources

Save high-quality sources to raw/ for future reference. Prioritize by source quality:

1. **Save to raw/**: official docs, original author posts (RFCs, maintainer blogs), in-depth technical articles with code examples
2. **URL only** (backlog sources, not saved to raw/): shallow overviews, listicles, undated posts, aggregator content
3. Skip: paywalled content, auto-generated pages, outdated material (2+ years for fast-moving topics)

For each source worth saving:

1. Save to `raw/{category}/{slug}.md` (auto-create folder)
2. Frontmatter format:
   ```yaml
   ---
   title: "Article Title"
   source: https://original-url
   fetched: YYYY-MM-DD
   tags:
     - {category}
     - {subtopic}
   ---
   ```
3. Body: the full content retrieved via WebFetch, converted to markdown
4. Raw files are immutable — if `raw/{category}/{slug}.md` already exists, skip (do not overwrite)
5. Record saved raw file paths for use in Phase 2

## Phase 2: Organize Backlog

1. Sort by learning order: Prerequisites → Core Concepts → Advanced
2. Add a one-line description per item
3. Gather user feedback: allow adding, removing, or reordering items

## Phase 3: Save

1. Save to `./til/{category}/backlog.md` (auto-create folder)
2. If `backlog.md` already exists, merge:
   - Preserve `[x]` completed items
   - Keep check state for matching items
   - Preserve existing sources, only add new items
   - sources values: use raw file paths (`raw/{category}/{slug}.md`) when saved in Phase 1.5, fall back to URLs for sources not saved locally
3. Add backlog link to TIL MOC
4. Commit all changes: `📋 research: {topic} learning backlog - {category}` (do not push)

## Backlog Template

Read `references/templates.md` for the exact backlog template and field descriptions.

## Arguments

- First: research topic (required)
- Second: category (optional, automatically detected if omitted)

## Rules

- One-line description per item, split into multiple files if over 20 items (long backlogs hurt readability and cause scroll fatigue)
- Links: `[display name](til/{category}/{slug}.md)`
