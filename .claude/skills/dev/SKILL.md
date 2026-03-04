---
description: "Create a feature branch + worktree, do the work, then automatically merge back to the current branch"
argument-hint: "\"feature description\" | --branch name \"description\" | --abort [branch]"
---

# Dev Skill — Feature Branch Workflow Automation

Create a feature branch, do the work in a worktree, then automatically merge back to the current branch and clean up.

## Usage

```
/dev "brief feature description"
/dev --branch custom-name "feature description"
/dev --abort [branch-name]
```

## Argument Handling

Extract the following from `$ARGUMENTS`:

1. **Feature description** (required, except for `--abort`): a quoted string describing what to implement concisely
2. **--branch** (optional): specify the branch name directly. Skips prefix detection and uses the given name as-is (e.g. `--branch hotfix/urgent` → branch name `hotfix/urgent`)
3. **--abort** (optional): abort an in-progress dev workflow and clean up the worktree

### `--abort` Handling

```bash
# 1. If branch-name is provided: find the worktree for that branch
# 2. If branch-name is omitted: print the worktree list and guide the user to re-run with a branch name
git worktree list
```

Output when branch-name is not specified:
```
Current registered worktrees:
{git worktree list output}

Specify the branch to clean up and run again:
  /dev --abort feat/my-feature
```

When branch-name is specified:
```bash
# Check for unmerged commits
git log "$BASE_BRANCH".."$BRANCH_NAME" --oneline

# Warn if commits exist
```

Confirmation message when there are unmerged commits:
```
[WARNING] This branch has {N} unmerged commit(s):
{commit list}

These commits cannot be recovered after deletion. Do you want to proceed?
```
**→ Use `AskUserQuestion` to request confirmation and wait for the user's response. Do not proceed with deletion until a response is received.**

After user confirmation:
```bash
WORKTREE_DIR=$(echo "$BRANCH_NAME" | tr '/' '-')
WORKTREE_PATH="../${PROJECT_NAME}-${WORKTREE_DIR}"

git worktree remove --force "$WORKTREE_PATH"

# Attempt safe delete → force delete only after user confirmation above
git branch -d "$BRANCH_NAME" || git branch -D "$BRANCH_NAME"  # -D only after confirmation above
```

### Automatic Branch Name Generation

Detect the **type of change** from the feature description to determine the prefix:

| Detected keywords | prefix | Example |
|-------------------|--------|---------|
| "fix", "bug", "error" | `fix/` | `fix/pty-path-bug` |
| "refactor", "cleanup", "improve" | `refactor/` | `refactor/mcp-server` |
| "docs", "README", "comment" | `docs/` | `docs/update-readme` |
| anything else (default) | `feat/` | `feat/add-dashboard` |

Slug generation rules:
- Translate non-English words to English (e.g. "PTY bug fix" → `fix/pty-bug`)
- Replace spaces/special characters with hyphens
- Maximum 30 characters, lowercase

### Worktree Path Generation

Replace `/` in the branch name with `-` for the worktree path:
```bash
WORKTREE_DIR=$(echo "$BRANCH_NAME" | tr '/' '-')
WORKTREE_PATH="../${PROJECT_NAME}-${WORKTREE_DIR}"
# Example: feat/add-dashboard → ../oh-my-til-feat-add-dashboard
```

## Path Rules (Important)

Claude Code's Bash tool does not preserve shell state (including `cd`) between calls. Therefore:

- **Use absolute paths in all bash commands**
- When working in a worktree: prefix every command with the absolute path of `$WORKTREE_PATH`
- When editing files (Read/Edit tools): reference files by their absolute path under `$WORKTREE_PATH`
- After Phase 5: use the absolute path of `$PROJECT_ROOT`
- Use literal absolute path strings rather than variable references (e.g. `/Users/.../oh-my-til-feat-xxx/src/main.ts`)

## Pre-flight Validation

Check all conditions below. Abort and notify the user if any one fails.

1. **Verify the working tree is clean**
   ```bash
   git status --porcelain
   ```
   Abort if there are uncommitted changes.

2. **Check the current branch**
   ```bash
   git branch --show-current
   ```
   - Abort if the output is empty (detached HEAD): "Cannot run in detached HEAD state"
   - Abort if on `main`: "Do not work directly on main. Run from a release or other branch"
   - If on a `release/*` branch, print: "[INFO] Running from release branch ({name}). Merge target: {name}"
   - Save the current branch as `BASE_BRANCH` (merge target)

3. **Save the project root**
   ```bash
   PROJECT_ROOT=$(git rev-parse --show-toplevel)  # absolute path
   PROJECT_NAME=$(basename "$PROJECT_ROOT")
   ```

4. **Abort if the feature description is empty**

## Confirmation Principle

**At any step that requires user confirmation, always wait for the user's response before proceeding.** Do not automatically advance to the next phase after printing a confirmation message. Use the `AskUserQuestion` tool to present choices and only continue after the user responds.

## Procedure

### Phase 1: Branch Creation Notice

Print the auto-generated branch name and proceed immediately:

```
[Phase 1/8] Creating branch
Branch: {BRANCH_NAME}
Worktree path: {WORKTREE_PATH}
Base branch: {BASE_BRANCH}
```

Proceed to Phase 2 without additional confirmation. Use `--branch` to specify the branch name manually.

### Phase 2: Worktree Creation

```
[Phase 2/8] Creating worktree...
```

```bash
# Check for path conflict
```

**If the path already exists — three branches:**

(a) If the path is registered in `git worktree list`:
```
An existing worktree was found: {path}
Reuse it, or delete and recreate? (Reuse / Delete and recreate)
```
**→ Use `AskUserQuestion` to present the choices and wait for the user's response.**

(b) If the path is not in `git worktree list` but the directory exists (stale worktree):
```bash
git worktree prune  # clean up stale entries
rm -rf "$WORKTREE_PATH"  # after user confirmation
```

(c) If the same branch is already checked out in another worktree:
```
[ERROR] Branch {BRANCH_NAME} is already in use by another worktree: {path}
Specify a different branch name: /dev --branch other-name "description"
```

**Normal creation:**
```bash
git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME"
```

```
Worktree created: {WORKTREE_PATH}
```

### Phase 3: Environment Setup + Implementation

```
[Phase 3/8] Installing dependencies + implementing...
```

1. **Install dependencies**
   ```bash
   cd "$WORKTREE_PATH" && npm install
   ```

2. **Rebuild native modules** (optional)
   ```bash
   cd "$WORKTREE_PATH" && npm run rebuild-pty
   ```
   **Note**: `rebuild-pty` requires the `ELECTRON_VERSION` environment variable. Failure when it is not set is **expected**. Unit tests (`npm test`) and builds (`npm run build`) work without native modules, so on failure only print the warning below and continue with implementation:
   ```
   [WARN] rebuild-pty failed (ELECTRON_VERSION not set). No impact on unit tests/builds.
   ```

3. **Implement based on the feature description**
   - Reference files inside `$WORKTREE_PATH` using **absolute paths** for browsing/editing
   - **Follow the project rules in CLAUDE.md** (core/platform layer separation, code style, etc.)
   - Write/update relevant tests after implementing
   - If there are structural changes (new files added, settings changed, skills added/removed), check **documentation sync**:
     - `CLAUDE.md` structure section
     - `README.md`, `README.ko.md` (if applicable)

### Phase 4: Verification

```
[Phase 4/8] Running tests + build verification... (attempt {N}/3)
```

Run from the worktree directory:

```bash
cd "$WORKTREE_PATH" && npm test && npm run build
```

**Retry rules on failure:**
- The retry counter starts at 0 when Phase 4 is entered and increments by 1 each time `npm test && npm run build` fails
- **Attempts 1–3**: Analyze the error, fix the code, and re-verify. Print on each attempt:
  ```
  [Phase 4/8] Verification failed. Fixing and retrying... (attempt {N}/3)
  ```
- **More than 3 attempts**: Abort the work, preserve the worktree, and report to the user:
  ```
  [FAIL] Verification failed (exceeded 3 attempts)
  Path: {WORKTREE_PATH}
  Branch: {BRANCH_NAME}
  Last error: {error summary}

  You can continue working manually in the worktree, or
  clean up with /dev --abort {BRANCH_NAME}
  ```
  **Do not proceed to Phase 5 or beyond in this case.**

**After automated verification passes — determine if real plugin testing is needed:**

Check the changed file paths from `git diff --name-only`. If any file matching the patterns below is included, ask the user to run a real plugin test:

| Pattern | Reason |
|---------|--------|
| `src/obsidian/main.ts` | Plugin lifecycle |
| `src/obsidian/settings.ts` | Settings tab UI |
| `src/obsidian/terminal/**` | Terminal rendering/PTY |
| `src/mcp/server.ts`, `src/mcp/tools.ts` | MCP server runtime |
| `src/obsidian/dashboard/**` | Dashboard UI |
| `skills/**` | Skill prompts (Claude Code behavior) |
| `rules/**` | Rule prompts |
| `styles.css` | UI styles |

If such files exist:

1. **Run vault deployment first** (so the user can test in Obsidian):
   - Confirm the vault path with the user, then run `npm run deploy -- --refresh-skills <vault-path>`
   - Or use the `/update-plugin <vault-path>` skill
2. After deployment, notify the user:
```
[Phase 4/8] Automated tests passed. Runtime-relevant changes detected.

Changed files:
- {list of runtime-related files}

Deployed to vault. Please reload the plugin in Obsidian and verify the feature directly.
Confirm when done.
```

**→ Use `AskUserQuestion` to present "Testing complete / Issue found" choices and wait for the user's response.**

- "Testing complete": proceed to Phase 5
- "Issue found": fix the issue described by the user and re-run Phase 4 (reset the retry counter)

If no runtime-related files are changed (pure logic/test/docs changes only): automatically proceed to Phase 5.

### Phase 5: Commit

```
[Phase 5/8] Committing changes...
```

After verification passes:

1. Review the changed files and write an appropriate commit message
2. Commit message uses conventional commit style with emoji prefix:
   - `✨ feat:` new feature
   - `🐛 fix:` bug fix
   - `♻️ refactor:` refactoring
   - `✅ test:` tests
   - `📝 docs:` documentation
3. Run the commit from the worktree directory
4. If a pre-commit hook fails: analyze the hook error, fix it, and attempt a new commit (not an amend)

### Phase 6: Pre-Merge Verification

```
[Phase 6/8] Verifying before merge...
```

Check the state of BASE_BRANCH before merging:

```bash
# 1. Verify BASE_BRANCH is still the current branch
CURRENT=$(git -C "$PROJECT_ROOT" branch --show-current)
# Abort if CURRENT != BASE_BRANCH (preserve worktree)
```

```bash
# 2. Verify BASE_BRANCH is clean
git -C "$PROJECT_ROOT" status --porcelain
# Abort if there are uncommitted changes (preserve worktree)
```

```bash
# 3. Check remote sync status
git -C "$PROJECT_ROOT" fetch origin "$BASE_BRANCH" 2>/dev/null
git -C "$PROJECT_ROOT" status -sb
```

If there are new commits from remote (`behind N`):
```
[WARN] {BASE_BRANCH} is {N} commit(s) behind the remote.
Pull first? (Pull then merge / Merge as-is / Abort)
```
**→ Use `AskUserQuestion` to present the choices and wait for the user's response. Do not proceed to merge until a response is received.**

All checks pass:
```
[OK] Pre-merge verification passed. BASE_BRANCH: {BASE_BRANCH} (clean, up-to-date)
```

### Phase 7: Merge

```
[Phase 7/8] Merging {BRANCH_NAME} → {BASE_BRANCH}...
```

```bash
# Merge (fast-forward preferred; merge commit if not possible)
git -C "$PROJECT_ROOT" merge "$BRANCH_NAME"
```

**On merge conflict — auto-resolution scope:**
- **Auto-resolve**: clear conflicts in source code (.ts, .js, etc.) where only one side changed
- **Immediately delegate to user**: `package-lock.json`, `*.lock`, binary files, or cases where both sides changed the same line differently
- If auto-resolution fails:
  ```
  [FAIL] Could not automatically resolve merge conflict.
  Conflict files: {list}

  Worktree ({WORKTREE_PATH}) is preserved.
  Resolve the conflicts manually and complete the merge.
  ```

**Post-merge verification after successful merge:**

```bash
cd "$PROJECT_ROOT" && npm test && npm run build
```

- **Pass**: proceed to Phase 8 (cleanup)
- **Fail**: make additional fixes on BASE_BRANCH → commit → re-verify (up to 3 attempts)
  ```
  [WARN] Post-merge verification failed. Fixing and retrying... (attempt {N}/3)
  ```
- **More than 3 failures**:
  ```
  [FAIL] Post-merge verification failed (exceeded 3 attempts)
  Merge to {BASE_BRANCH} is complete, but tests/builds are failing.

  Recovery options:
  1. Fix manually and commit
  2. Revert the merge: git revert -m 1 HEAD
  3. Undo the merge (caution: also removes subsequent commits): git reset --hard HEAD~1

  Worktree ({WORKTREE_PATH}) is preserved.
  ```
  **Do not proceed to Phase 8 in this case.**

### Phase 8: Cleanup

```
[Phase 8/8] Cleaning up worktree + branch...
```

Automatic cleanup after all verifications pass:

```bash
# Remove the worktree (--force needed due to untracked files like node_modules)
git worktree remove --force "$WORKTREE_PATH"

# Attempt safe delete
git branch -d "$BRANCH_NAME"
```

If `git branch -d` fails (not fully merged):
```
[WARN] Branch {BRANCH_NAME} was flagged as not fully merged.
Force delete? (Delete / Keep)
```
**→ Use `AskUserQuestion` to present the choices and wait for the user's response.**

Force delete with `-D` or keep the branch based on user confirmation.

Completion message:
```
[DONE] Work complete!
{BRANCH_NAME} → {BASE_BRANCH} merged
Commit: {commit hash} {commit message}
Changed files: {N}
Tests: passed
Build: passed
Worktree + branch cleaned up
```

## Error Handling Summary

| Situation | Response | Worktree |
|-----------|----------|----------|
| Existing worktree at path | Ask to reuse or delete and recreate | Preserved |
| Stale directory at path | Run `git worktree prune` then clean up | Recreated after cleanup |
| Same branch checked out in another worktree | Guide to different name and abort | — |
| npm install fails | Print error log and abort | Preserved |
| rebuild-pty fails | Expected failure. Print warning, continue | Preserved |
| Test/build fails (>3 attempts) | Report status and abort | Preserved |
| Pre-commit hook fails | Fix hook error and attempt new commit | Preserved |
| Pre-merge: branch changed | Explain situation and abort | Preserved |
| Pre-merge: new commits on remote | Ask pull / continue / abort | Preserved |
| Merge conflict (auto-resolve fails) | Guide user and abort | Preserved |
| Post-merge test fails (>3 attempts) | Provide 3 recovery options and abort | Preserved |
| branch -d fails | Confirm with user then -D or keep | Removed |

**Principle**: Do not delete the worktree on failure. Preserve it so the user can continue working manually or clean up with `--abort`.

## Notes

- This skill must be run from the project root directory (where `package.json` is located)
- Cannot run on the `main` branch (project rule: no direct work on main)
- Cannot run in detached HEAD state (merge target branch is undefined)
- A separate `node_modules` is needed inside the worktree, so `npm install` is run there
- Merge is performed into the branch that was current at skill invocation time
- `--abort` warns and requests confirmation if there are unmerged commits
- All bash commands use absolute paths (Claude Code does not preserve shell state between calls)
