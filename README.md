# Affinity MCP Server

A local, client-neutral MCP bridge from agents to Affinity's built-in MCP server.
It speaks MCP over **stdio** to the agent and forwards tool discovery and calls
to Affinity's local HTTP+SSE endpoint. Agents that can launch standard local
stdio MCP servers can use the same bridge without client-specific server code.

Affinity's official setup currently supports Claude Desktop. This bridge adapts
Affinity's local MCP server to standard MCP over stdio, so other stdio-capable
clients can try it; only clients that have actually been exercised should be
described as verified.

## Requirements

- Affinity desktop with its MCP server enabled
- Node.js 20 or newer
- An MCP-compatible agent that supports local stdio servers

## Run locally

From this folder, run `npm install`, then configure the agent to launch:

```sh
node /absolute/path/to/affinity-mcp-server/src/index.js
```

The default upstream URL is `http://localhost:6767/sse`. If Affinity uses a
different local endpoint, set `AFFINITY_MCP_SSE_URL` in the agent's server
environment. For safety, the bridge only accepts loopback hostnames.
The default endpoint is based on a [community Affinity bridge](https://github.com/andre-carbajal/affinity-mcp-bridge), not an official endpoint specification. See Troubleshooting below if the status tool reports that Affinity is unavailable.

## What it exposes

- `affinity_bridge_status` — check whether the Affinity MCP server is reachable.
- Affinity's available tools — their descriptions and schemas are forwarded as
  provided by the installed Affinity version; calls go directly to Affinity.

If Affinity is closed or its MCP server is disabled, the bridge still starts and
reports only the status tool. It reconnects when the agent asks for tools again.

## Client-neutral design

The bridge uses the MCP TypeScript SDK's standard stdio server transport and
legacy SSE client transport. Client-specific launch settings belong in each
agent's own MCP configuration; they do not change the bridge protocol or code.

Example Codex configuration (edit the path for this machine):

```toml
[mcp_servers.affinity]
command = "/opt/homebrew/bin/node"
args = ["/absolute/path/to/affinity-mcp-server/src/index.js"]
startup_timeout_sec = 30
```

Example Claude Desktop configuration:

```json
{
  "mcpServers": {
    "affinity": {
      "command": "/opt/homebrew/bin/node",
      "args": ["/absolute/path/to/affinity-mcp-server/src/index.js"]
    }
  }
}
```

Other MCP clients use their own configuration format, but should launch the
same Node command over stdio.

## Troubleshooting and verification

Run `affinity_bridge_status` from your MCP client. A successful bridge
connection reports the Affinity server as reachable; once connected, the
Affinity tools should appear alongside `affinity_bridge_status`.

If only the status tool appears or it reports `ECONNREFUSED`:

1. In Affinity **Settings → Model Context Protocol**, enable **Enable Affinity MCP**.
2. Leave other permissions off unless the task needs them. File access, network
   access, Canva AI, and script permissions control what Affinity can do; this
   bridge does not grant those permissions.
3. Restart Affinity and the MCP host (for example, quit and reopen the agent),
   then reconnect. Affinity's setup guide specifically recommends restarting
   Affinity and Claude Desktop when the connection fails.
4. If it still fails, check that the local URL is correct for your installed
   Affinity release. Set `AFFINITY_MCP_SSE_URL` in the MCP server environment
   if the endpoint differs from the community-documented default.

### Current machine status

The bridge starts and completes an MCP stdio handshake. Affinity's MCP toggle
is enabled in the visible settings panel, but the expected local endpoint
`http://localhost:6767/sse` refused the connection at the last check. Therefore
Affinity tool discovery and calls have **not yet been verified**. Restart
Affinity and Codex, then call `affinity_bridge_status` to complete the live
check. Codex also needs to be relaunched to load the registered server entry.

## Permissions

The bridge itself only calls the local Affinity endpoint and does not grant
Affinity file or network permissions. Affinity's MCP settings remain the
authority for what tools can do. Keep file access, network access, Canva AI,
and script permissions disabled unless a workflow needs them.

Affinity's scripting/MCP features are still evolving. This bridge forwards the
capabilities exposed by the installed app; it does not make unsupported Affinity
operations available.
# affinity-global-mcp-connector
