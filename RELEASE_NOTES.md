## What's Changed

### Features
- New `/til-lint` skill — TIL wiki health-check detecting missing frontmatter, broken links, orphan TILs, SRS coverage gaps, and stale content
- Raw source layer — `/research` now saves high-quality sources to `raw/{category}/{slug}.md` (immutable), `/til` reads raw files before falling back to WebFetch, `/save` links TILs back to raw sources in the References section
- `/til-lint` also checks raw source coverage (unprocessed raw files, broken raw references)

### Documentation
- Updated CLAUDE.md and READMEs to reflect the new skill and raw layer convention

**Full Changelog**: https://github.com/SongYunSeop/oh-my-til/compare/v1.3.0...v1.4.0
