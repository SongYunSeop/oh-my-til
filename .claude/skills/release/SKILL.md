---
description: "Create a new release. Version bump → test → build → tag → GitHub Release"
argument-hint: "[patch|minor|major]"
allowed-tools: Read, Edit, Bash(npm *), Bash(git *), Bash(gh *)
disable-model-invocation: true
---

# Create GitHub Release

Create a new release.

## Arguments

Extract the bump type from `$ARGUMENTS`: `patch`, `minor`, `major` (default: `patch`).
If a numeric version (e.g. `0.2.0`) is provided directly, use that version.
If no argument is given, apply a `patch` bump.

## Pre-flight Validation

1. Verify the working tree is clean (`git status --porcelain`). Abort if there are uncommitted changes.
2. Verify the current branch is `main`. Abort otherwise.
3. Verify `main` is in sync with `origin/main` (`git fetch origin && git diff main origin/main --quiet`). Notify the user and abort if there are differences.
4. Verify the `gh` CLI is installed. Abort if not found.

## Version Determination

- Read the current version from `manifest.json`
- Calculate semver based on bump type:
  - `patch`: 0.1.3 → 0.1.4
  - `minor`: 0.1.3 → 0.2.0
  - `major`: 0.1.3 → 1.0.0
- Confirm the calculated new version with the user

## Documentation Validation

Validate that documentation is up to date before bumping the version:

1. Compare the actual file list in `src/` against the structure section in `CLAUDE.md`
2. Verify the following items in `CLAUDE.md`, `README.md`, `README.ko.md` match the current code:
   - Skill list (`/til`, `/backlog`, `/research`, `/save`, etc.)
   - Settings entries (cross-check with the interface in settings.ts)
   - Project structure (file tree)
   - Build/deploy commands
3. Fix any missing or mismatched items; proceed to the next step if everything is in order

## Procedure

1. Verify tests pass with `npm test`
2. Verify production build with `npm run build`
3. Update the version in the following **3 files** to the new version:
   - `package.json` → `"version"`
   - `manifest.json` → `"version"`
   - `versions.json` → add new version entry (read minAppVersion from manifest.json)
   - (`plugin-version` in `skills/` is auto-substituted via the `__PLUGIN_VERSION__` placeholder)
4. Sync landing page version: run `npm run sync-version` (updates hero-badge version in `docs/index.html`, `docs/ko/index.html`)
5. Commit changes: `🔖 chore: release v{version}`
6. Create tag: `git tag v{version}`
7. Push: `git push origin main --tags`
8. Write release notes (see template below)
9. Publish to npm:
   ```
   npm publish
   ```
10. Create GitHub Release:
    ```
    gh release create v{version} main.js manifest.json styles.css --title "v{version}" --notes "{release notes}"
    ```

Assets must be exactly these three files: `main.js`, `manifest.json`, `styles.css`.

## Post-Release Verification

1. Verify the release commit is reflected on the remote with `git log origin/main --oneline -1`
2. Verify the tag exists both locally and remotely with `git tag -l v{version}` and `git ls-remote origin refs/tags/v{version}`
3. Verify the release commit is reachable from the `main` branch: `git branch --contains v{version}` must include `main`
4. If any check fails, warn the user and provide guidance for manual remediation

## Writing Release Notes

Analyze commits from the previous tag to HEAD and write release notes.

### Commit Analysis

```bash
git log {previous-tag}...HEAD --oneline
```

If there is no previous tag, include all commits.

### Commit Classification Rules

Classify by commit prefix emoji or type:

| prefix | category |
|--------|----------|
| `✨ feat` | Features |
| `♻️ refactor`, `⚡ perf`, `🎨 style` | Improvements |
| `🐛 fix` | Bug Fixes |
| `📝 docs` | Documentation |
| `✅ test` | Tests |
| `🔖 chore`, `🔧 chore` | Chores (exclude from release notes) |

Classify development tooling/workflow changes that are not user-facing as **Internal**.

### Release Notes Template

```markdown
## What's Changed

### Features
- Summary of change (rewrite commit message from the user's perspective)

### Improvements
- Summary of improvement

### Bug Fixes
- Summary of fix

### Documentation
- Summary of documentation change

### Internal
- Summary of dev tooling/workflow changes

**Full Changelog**: https://github.com/{owner}/{repo}/compare/{previous-tag}...v{version}
```

### Writing Guidelines

- Do not copy commit messages verbatim; rewrite them **from the user's perspective**
- Write in English
- Exclude `chore` commits (version bumps, releases, etc.) from the notes
- Omit empty category sections entirely
- If a category has only one item, it is acceptable to list it without a section heading
