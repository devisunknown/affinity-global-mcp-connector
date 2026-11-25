# Affinity MCP Server: implementation plan and status

## Goal

Expose Affinity's document capabilities through a client-neutral MCP server. The bridge itself should not depend on Codex, Claude, or another specific agent.

## Findings

- The installed app is Affinity 3.3.3.
- Its bundle includes an MCP server and a JavaScript scripting SDK.
- Affinity's official MCP setup currently documents Claude Desktop as the supported client. The server runs locally.
- A community bridge documents Affinity's local SSE endpoint as `http://localhost:6767/sse`; the endpoint has not yet been verified against this installation because the Affinity MCP server is disabled.
- The Affinity settings panel currently shows its main MCP toggle on. Desktop file access, network access, and Canva AI are off. Saved-script access, script saving, local task hints, and sharing task hints are on.
- The bridge is a compatibility adapter: standard MCP over stdio toward agents, legacy HTTP+SSE toward Affinity.

## Implemented

1. **Client-neutral stdio MCP bridge**
   - Uses the official MCP TypeScript SDK 1.32.2.
   - Forwards Affinity tool discovery and calls without changing tool names or schemas.
   - Adds `affinity_bridge_status`, so a client can start even while Affinity is unavailable.
   - Defaults to `http://localhost:6767/sse`, configurable through `AFFINITY_MCP_SSE_URL`.
   - Restricts upstream URLs to loopback hostnames.
2. **Client setup documentation**
   - Includes a generic stdio invocation and example Codex and Claude Desktop configuration snippets.
   - Documents that another agent must support local stdio MCP servers.
3. **Initial verification**
   - Node syntax check passes.
   - A local MCP client handshake successfully listed the status tool.
   - Latest live endpoint check returned `ECONNREFUSED` for both IPv6 and IPv4 loopback at port 6767. Affinity tools have not been discovered or called yet.
4. **Codex registration**
   - Added the local stdio server entry to Codex's user-level MCP configuration.
   - `codex mcp get affinity --json` confirms the command, path, and enabled state.

## Current status and remaining

1. Restart Affinity and Codex. Affinity's official troubleshooting instructs users to restart Affinity and the assistant when the connection fails.
2. Verify the endpoint against Affinity 3.3.3, discover and forward its tools, and run a harmless read-only operation.
3. If available, verify the same bridge with a second independent MCP client; otherwise document protocol-level compatibility without claiming that every host was exercised.
4. Update this status after the live check. The README now records the unverified connection and recovery steps.

## Project layout

```text
affinity-mcp-server/
├── PLAN.md
├── README.md
├── package.json
├── package-lock.json
├── src/
│   └── index.js
└── examples/
    └── clients/
        └── generic-stdio.md
```
