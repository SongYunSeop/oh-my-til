# Claude TIL

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Obsidian](https://img.shields.io/badge/Obsidian-v1.5.0+-7C3AED)](https://obsidian.md)
[![Version](https://img.shields.io/github/v/release/SongYunSeop/obsidian-claude-til)](https://github.com/SongYunSeop/obsidian-claude-til/releases)

**English** | [한국어](README.ko.md)

An Obsidian plugin that embeds a Claude Code terminal in the sidebar and provides an AI-powered TIL (Today I Learned) learning workflow.

## Features

- **Embedded Terminal** — Claude Code terminal in Obsidian sidebar (xterm.js + node-pty)
- **Built-in MCP Server** — Claude Code can directly access your vault via WebSocket
- **Learning Dashboard** — TIL statistics and category breakdown at a glance
- **Auto-installed Skills** — `/til`, `/research`, `/backlog` commands ready out of the box
- **File Watcher** — Newly created TIL files open automatically in the editor

## How It Works

```
Command Palette → Open Terminal → Claude Code starts
→ Run /til, /backlog, /research skills
→ Claude researches → interactive learning → saves TIL markdown
→ New file detected → opens in editor
```

## Getting Started

### Prerequisites

- [Obsidian](https://obsidian.md) v1.5.0+
- [Node.js](https://nodejs.org) 18+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (`claude`)

### Installation

```bash
git clone https://github.com/SongYunSeop/obsidian-claude-til.git
cd obsidian-claude-til
npm install
npm run deploy -- /path/to/your/vault
```

Restart Obsidian, then enable **Claude TIL** in Settings > Community plugins.

### MCP Server Setup (Optional)

The plugin runs a WebSocket-based MCP server so Claude Code can access your vault directly:

```bash
claude mcp add --transport ws claude-til ws://localhost:22360
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Shell Path | System default | Shell to use in the terminal |
| Auto Launch Claude | `true` | Run `claude` when terminal opens |
| Font Size | `13` | Terminal font size (px) |
| TIL Folder | `til` | Where TIL files are stored (relative to vault root) |
| Auto Open New TIL | `true` | Open new TIL files in editor automatically |
| MCP Server | `true` | Enable built-in MCP server |
| MCP Port | `22360` | WebSocket server port |

## MCP Tools

When the MCP server is connected, Claude Code can use these tools:

| Tool | Description |
|------|-------------|
| `vault_read_note` | Read note content by path |
| `vault_list_files` | List files in a folder with optional filtering |
| `vault_search` | Full-text search across the vault |
| `vault_get_active_file` | Get the currently open file |
| `til_list` | List TIL files grouped by category |
| `til_backlog_status` | Backlog progress summary with checkbox counts |

## Claude Skills

The plugin auto-installs these skills to `.claude/skills/`:

| Skill | Command | Description |
|-------|---------|-------------|
| **til** | `/til <topic> [category]` | Research a topic → interactive learning → save TIL |
| **research** | `/research <topic> [category]` | Research a topic and create a learning backlog |
| **backlog** | `/backlog [category]` | View learning backlog and progress |

## Development

```bash
npm run dev              # Watch mode (esbuild)
npm test                 # Run tests (vitest)
npm run rebuild-pty      # Rebuild node-pty for Obsidian's Electron
npm run deploy -- /path  # Deploy to vault
```

### Project Structure

```
src/
├── main.ts                  # Plugin entry point
├── settings.ts              # Settings tab & interface
├── skills.ts                # Skill auto-installer
├── watcher.ts               # File watcher → open in editor
├── terminal/
│   ├── TerminalView.ts      # Sidebar terminal (ItemView + xterm.js)
│   └── pty.ts               # PTY process manager (node-pty)
├── mcp/
│   ├── server.ts            # MCP server lifecycle
│   ├── transport.ts         # WebSocket transport adapter
│   └── tools.ts             # MCP tool definitions
└── dashboard/
    ├── DashboardView.ts     # Learning dashboard (ItemView)
    └── stats.ts             # TIL statistics
```

### Tech Stack

| | |
|---|---|
| **Runtime** | TypeScript, Obsidian Plugin API |
| **Terminal** | xterm.js, node-pty |
| **MCP** | @modelcontextprotocol/sdk, ws |
| **Build** | esbuild |
| **Test** | vitest |

## Roadmap

- [x] Embedded Claude Code terminal
- [x] Built-in MCP server
- [x] Learning dashboard (basic stats)
- [ ] Backlog progress bars in dashboard
- [ ] Rich dashboard — recent TILs, streaks, weekly summary
- [ ] Note linking — auto-insert backlinks to related notes

## Acknowledgments

- [claude-code-terminal](https://github.com/dternyak/claude-code-terminal) — Original xterm.js + node-pty Obsidian integration pattern
- [Obsidian Developer Docs](https://docs.obsidian.md/Home)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## License

[MIT](LICENSE)
