# CLAUDE.md - oh-my-til

## Project Overview

A Claude Code-based TIL learning workflow plugin. Can be run as a standalone CLI (`npx oh-my-til`) without Obsidian, or embedded as a sidebar Claude Code terminal via the Obsidian plugin. Built on xterm.js + node-pty.

Core flow: Command palette → Open terminal → Run `/til`, `/backlog`, `/research`, `/save`, `/til-review`, `/dashboard`, `/omt-setup` skills directly in Claude Code → Open newly detected files in editor

Obsidian's role is limited to "terminal embedding + file watching + skill deployment + MCP server + dashboard". Workflow control belongs to Claude Code. For standalone use, install the Claude Code plugin and register the MCP server with `npx oh-my-til mcp`.

## Project Philosophy

The core value lies in Claude Code-based learning workflows (skills, MCP tools, learning context analysis).
Obsidian is the current validation environment and deployment channel; core logic must work without Obsidian.

- **Core layer** (Obsidian-independent): Skill prompts, MCP tool logic (context.ts, backlog.ts, stats.ts), learning workflow design
- **Platform adapter** (Obsidian-dependent): Terminal embedding, file watching, dashboard UI, settings tab, Plugin lifecycle

When adding new features, place logic in the core layer and UI/event wiring in the platform adapter.

## Tech Stack

- TypeScript + Obsidian Plugin API
- xterm.js (@xterm/xterm) — terminal rendering
- node-pty — PTY (pseudo-terminal) process management
- @modelcontextprotocol/sdk — MCP protocol implementation
- zod — input schema validation (MCP SDK peer)
- @electron/rebuild — native module rebuild (Electron 37.10.2)
- esbuild — bundler

## Key References

- [claude-code-terminal](https://github.com/dternyak/claude-code-terminal) — original implementation of the xterm.js + node-pty Obsidian integration pattern

## Structure

```
src/
├── core/                     ← platform-independent pure logic
│   ├── backlog.ts            ← backlog parsing/formatting pure functions (parseBacklogItems, extractTopicFromPath, parseBacklogSections, parseFrontmatterSources)
│   ├── context.ts            ← learning context pure functions (topic matching, recent activity, formatting)
│   ├── stats.ts              ← dashboard statistics pure functions (streak, heatmap, enhanced categories, backlog progress, review due count)
│   ├── srs.ts                ← SRS (spaced repetition) pure functions (SM-2 algorithm, review card filter/sort/stats)
│   ├── migrate-links.ts      ← Wikilink [[]] → [](path) conversion pure functions
│   ├── keyboard.ts           ← Shift+Enter → \n conversion pure functions (Claude Code multiline support)
│   ├── env.ts                ← ensurePath(): macOS Homebrew PATH correction
│   ├── skills.ts             ← version comparison/placeholder substitution pure functions
│   ├── cli.ts                ← CLI argument parsing pure functions (parseArgs)
│   ├── config.ts             ← config file parsing/loading pure functions
│   ├── markdown.ts           ← markdown → HTML conversion pure functions (no external dependencies)
│   ├── profile.ts            ← static site page generation (profile, TIL pages, category index)
│   └── index.ts              ← barrel export
├── ports/                    ← adapter interfaces
│   ├── storage.ts            ← FileStorage interface
│   └── metadata.ts           ← MetadataProvider interface
├── adapters/                 ← port implementations
│   ├── fs-adapter.ts         ← node:fs based (standalone)
│   └── obsidian-adapter.ts   ← Obsidian App based
├── mcp/                      ← MCP server (port-dependent, Obsidian-agnostic)
│   ├── context.ts            ← learning context tools (topic matching, category extraction)
│   └── tools.ts              ← MCP tool definitions (uses FileStorage + MetadataProvider)
├── cli/                      ← standalone CLI entry point
│   ├── index.ts              ← npx oh-my-til mcp / install-obsidian / deploy
│   └── obsidian-install.ts   ← Obsidian plugin auto-install (Electron detection, node-pty rebuild)
└── obsidian/                 ← Obsidian platform adapter
    ├── main.ts               ← TILPlugin entry point (terminal view + dashboard + watcher + skill install)
    ├── settings.ts           ← settings tab + interface
    ├── watcher.ts            ← new TIL file detection → open in editor
    ├── terminal/
    │   ├── TerminalView.ts   ← sidebar terminal (ItemView + xterm.js)
    │   ├── MarkdownLinkProvider.ts ← 3 ILinkProviders: MarkdownLinkProvider ([text](path) + CJK), FilepathLinkProvider (til/ paths), Osc8LinkProvider (OSC 8 hyperlinks + IMarker)
    │   └── pty.ts            ← PTY process management (node-pty)
    └── dashboard/
        └── DashboardView.ts  ← learning dashboard (Summary Cards + Heatmap + Categories + Recent + Backlog)

skills/                   ← Claude Code Plugin skills + skill sources installed at Obsidian init
agents/                   ← custom agents (til-fetcher)
hooks/                    ← Claude Code Plugin hooks
├── hooks.json            ← hook declarations (uses ${CLAUDE_PLUGIN_ROOT} variable)
├── notify-complete.sh    ← task completion notification script
└── check-obsidian.sh     ← Obsidian vault detection + guidance script
.mcp.json                 ← MCP server auto-registration config
vault-assets/
└── claude-md-section.md  ← init flow only: MCP guidance template inserted into .claude/CLAUDE.md

.claude-plugin/           ← Claude Code Plugin manifest (repo root = plugin root)
├── plugin.json           ← plugin metadata (standard structure, no build required)
└── marketplace.json      ← marketplace catalog

__tests__/
├── mock-obsidian.ts      ← obsidian module mock
├── utils.test.ts         ← settings defaults tests
├── skills.test.ts        ← skill/rule version-based install/update logic tests
├── watcher.test.ts       ← file watch filtering logic tests
├── stats.test.ts         ← dashboard statistics (basic + streak, heatmap, enhanced categories, backlog) tests
├── srs.test.ts           ← SRS spaced repetition (SM-2 algorithm, frontmatter parse/update, card filter/stats) tests
├── mcp-tools.test.ts     ← MCP tool filtering/aggregation logic tests
├── context.test.ts       ← learning context pure function tests
├── main-logic.test.ts    ← plugin core logic (watcher sync, settings validation)
├── backlog.test.ts       ← backlog parsing/path extraction tests
├── markdown-link-provider.test.ts ← markdown link detection + CJK cell width + OSC 8 pure function tests
├── shift-enter.test.ts   ← Shift+Enter key handler pure function tests
├── ensure-path.test.ts   ← macOS PATH correction tests
├── migrate-links.test.ts ← Wikilink → markdown link conversion tests
├── adapters.test.ts      ← fs-adapter / obsidian-adapter port implementation tests
├── cli.test.ts           ← CLI argument parsing (positional + options + boolean flags) tests
├── config.test.ts        ← config file parsing/loading tests
├── obsidian-install.test.ts ← Obsidian plugin install pure functions (artifacts, version validation) tests
├── markdown.test.ts      ← markdown → HTML conversion pure function tests
└── profile.test.ts       ← static site page generation (profile, TIL, category index) tests
```

## Build

```bash
npm install
npm run rebuild-pty    # rebuild node-pty for the Obsidian Electron version
npm run dev            # watch mode
npm run build          # build Obsidian plugin + CLI
npm run build:obsidian # build Obsidian plugin only
npm run build:cli      # build CLI only
npm test               # run vitest tests
npm run deploy -- <vault-path>  # deploy to vault (build + copy + pty rebuild)
npm run deploy -- --refresh-skills <vault-path>  # includes force reinstall of skills/rules
```

### Standalone CLI (running without Obsidian)

```bash
npx oh-my-til mcp ~/my-til                      # MCP server stdio mode (Claude Desktop, etc.)
npx oh-my-til deploy ~/my-til                   # generate TIL static site (_site/)
npx oh-my-til deploy ~/my-til --out docs --title "My TIL" --github https://github.com/user
npx oh-my-til install-obsidian ~/vault           # install Obsidian plugin only
ELECTRON_VERSION=37.10.2 npx oh-my-til install-obsidian ~/vault  # manually specify Electron version
```

## Rules

- **Always work on a feature branch + worktree when making code changes**. Never modify the main branch directly.
- **Always discuss direction with the user before new features or workflow changes**. For tasks with multiple implementation options, do not write code immediately — propose approaches, reach agreement, then proceed.
- **Branch isolation (git worktree)**: Use `git worktree` to isolate working directories for feature branch work. If another feature task is needed from the current branch, guide the user to create a separate worktree with `git worktree add ../oh-my-til-<branch-name> <branch-name>`. Do not switch branches in the same directory.
- Import Obsidian API from the `obsidian` module
- Load node-pty via `electronRequire` (regular import not possible, native module)
- Resources registered in `onload()` are automatically released
- Always kill PTY processes in `onunload()`
- Use `vault.on('create', ...)` for file watching
- `isDesktopOnly` in manifest.json must be `true` (required by node-pty native module)
- node-pty is treated as external in esbuild
- UI workflows (topic input, backlog selection) are handled by Claude Code skills — do not duplicate in Obsidian
- MCP server is managed by the Claude Code plugin system (`.mcp.json`), not by the Obsidian plugin
- Dashboard uses pure DOM manipulation (no framework), leverages Obsidian CSS variables
- For code changes, always write/run tests before committing (`npm test && npm run build` must pass)
- Skill files are installed at `.claude/skills/<name>/SKILL.md` (Claude Code only discovers 1 level deep, no nesting)
- Skill file auto-updates are managed via `plugin-version` frontmatter. Files without it are treated as user-customized and will not be overwritten
- Backlog files follow the `til/{category}/backlog.md` path pattern
- Write in English; use original technical terms as-is
- **Documentation sync**: When structural changes occur (new files added, settings changed, skills added/removed), update `CLAUDE.md`, `README.md`, and `README.ko.md` accordingly (structure section, feature list, settings table, skills list)
- **Version management**: `plugin-version` in `skills/` is managed with the `__PLUGIN_VERSION__` placeholder, which `skills.ts` automatically substitutes with the `manifest.json` version at install time. Only 3 files need manual updates at release time: `package.json`, `manifest.json`, `versions.json`. Use the `/release` skill.

## Reference Documentation

- [Obsidian Developer Docs](https://docs.obsidian.md/Home)
- [Plugin API Reference](https://docs.obsidian.md/Reference/TypeScript+API/Plugin)
- [xterm.js docs](https://xtermjs.org/docs/)
- [node-pty (GitHub)](https://github.com/microsoft/node-pty)
- [claude-code-terminal source](https://github.com/dternyak/claude-code-terminal)
