---
description: "Create a new release. Version bump → test → build → tag → GitHub Release"
argument-hint: "[patch|minor|major]"
allowed-tools: Read, Edit, Bash(npm *), Bash(git *), Bash(gh *)
---

# Create GitHub Release

Create a new release.

## Arguments

Extract the bump type from `$ARGUMENTS`: `patch`, `minor`, `major` (default: `patch`).
If a numeric version (e.g. `0.2.0`) is provided directly, use that version.
If no argument is given, apply a `patch` bump.

## Pre-flight Validation

1. Verify the working tree is clean (`git status --porcelain`). Abort if there are uncommitted changes.
2. Determine the base branch:
   - If `develop` exists and has commits the user wants to release, use `develop → main` flow
   - If releasing only from `main` (e.g., a hotfix branch already merged to main), use `main-direct` flow
   - Confirm with the user which flow to use
3. Verify the base branch is in sync with its origin (`git fetch origin && git diff {branch} origin/{branch} --quiet`). Notify the user and abort if there are differences.
4. Verify the `gh` CLI is installed. Abort if not found.
5. Check if `main` is a protected branch: `gh api repos/{owner}/{repo}/branches/main --jq '.protected'`. If protected, the release MUST go through a PR (direct push will fail).

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
3. Verify the build artifact is fresh: `main.js` modification time must be within the last 60 seconds. If stale, abort and investigate — a stale `main.js` means the build did not update the artifact (`.gitignore` tracks it but `npm files` includes it).
4. Update the version in the following **3 files** to the new version:
   - `package.json` → `"version"`
   - `manifest.json` → `"version"`
   - `versions.json` → add new version entry (read minAppVersion from manifest.json)
   - (`plugin-version` in `skills/` is auto-substituted via the `__PLUGIN_VERSION__` placeholder)
5. Sync landing page version: run `npm run sync-version` (updates hero-badge version in `docs/index.html`, `docs/ko/index.html`)
6. Write release notes to `RELEASE_NOTES.md` (see template below) — this file is read by GitHub Actions to populate the GitHub Release body
7. Create a release branch from the base branch and commit all changes there:
   ```bash
   git checkout -b release/v{version}
   git add package.json manifest.json versions.json RELEASE_NOTES.md <synced-docs>
   git commit -m "🔖 chore: release v{version}"
   git push -u origin release/v{version}
   ```
8. Open a PR against `main`:
   ```bash
   gh pr create --base main --head release/v{version} --title "chore: release v{version}" --body "..."
   ```
9. **Wait for the user to merge the PR.** Do NOT proceed until merge is confirmed. Ask the user to confirm when merge is done and to use "Merge commit" strategy (preserves the release commit SHA).
10. After merge, fetch and pull main:
    ```bash
    git checkout main
    git pull origin main
    ```
11. Create the tag on the merge commit on `main` and push it:
    ```bash
    git tag v{version}
    git push origin v{version}
    ```
12. (Optional) Delete the release branch: `git push origin --delete release/v{version}` and `git branch -d release/v{version}`

> **Critical rules:**
> - **NEVER create the tag before the PR is merged.** If `git push origin main --tags` is rejected due to branch protection, the tag may still be pushed on its own — triggering the release workflow against an orphan commit. If this happens, delete the remote tag (`git push origin --delete v{version}`) immediately.
> - **NEVER use `--tags` when pushing a protected main.** Push the tag separately AFTER the PR is merged and main is updated.
> - `npm publish` and GitHub Release creation are handled automatically by GitHub Actions when the tag is pushed (`.github/workflows/release.yml`). No manual publish step needed.

## Post-Release Verification

1. Verify the release commit is reflected on the remote with `git log origin/main --oneline -1`
2. Verify the tag exists both locally and remotely with `git tag -l v{version}` and `git ls-remote origin refs/tags/v{version}`
3. Verify the tag points to a commit on `main` that contains the version bump (the merge commit or release commit). Run `git show v{version}:package.json | grep version` and confirm it shows the new version.
4. Verify the release commit is reachable from the `main` branch: `git branch --contains v{version}` must include `main`
5. Verify GitHub Actions release workflow was triggered: `gh run list --workflow=release.yml -R {owner}/{repo} --limit 1`
6. Verify npm package was published: `npm view {package-name}@{version}` should return the package info.
7. If any check fails, warn the user and provide guidance for manual remediation.

### Recovery: tag points to the wrong commit

If the tag ends up on an unexpected commit (e.g., `action-gh-release` retargeted it to `main` HEAD before the merge landed):

```bash
git tag -f v{version} <correct-commit-sha>
git push origin v{version} --force
```

Note: this will re-trigger the release workflow, which will fail at `npm publish` if the version is already published (that's expected — the artifact is already live).

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
