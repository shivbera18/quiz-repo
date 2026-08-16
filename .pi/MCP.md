# Project MCP Servers

The project uses [`pi-mcp-adapter`](https://github.com/nicobailon/pi-mcp-adapter) with server definitions in `../.mcp.json`.

## Configured servers

- `context7` — current library/framework documentation via `@upstash/context7-mcp@4.0.2`.
- `playwright` — headless browser inspection and interaction via `@playwright/mcp@0.0.79`.
- `project-memory` — local knowledge graph via `@modelcontextprotocol/server-memory@2026.7.4`.

All servers are lazy and start only on first use. The adapter exposes a compact `mcp` proxy tool to avoid putting every MCP schema into the normal prompt. MCP tools are used from the parent Pi session; delegated agents use native tools, skills, web research, or Playwright scripts in the current Windows project-local setup.

## Commands

Inside Pi:

```text
/mcp
/mcp status
/mcp reconnect context7
/mcp reconnect playwright
/mcp reconnect project-memory
```

Ask naturally:

```text
Use Context7 to check the current Fastify guidance for request validation.
Use Playwright MCP to inspect the local quiz flow.
Remember this stable architecture decision in project memory.
```

## Security and state

- No API keys or credentials are committed.
- Context7 runs without an API key; set `CONTEXT7_API_KEY` in your environment if higher limits are needed.
- Playwright runs headless and should not be given production credentials.
- Memory is stored in `.pi/mcp-memory.jsonl`, which is ignored by Git.
- Filesystem and shell MCP servers are intentionally omitted because Pi already provides narrower native tools.
