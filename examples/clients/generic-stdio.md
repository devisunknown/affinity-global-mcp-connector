# Generic MCP client configuration

For any agent that supports local MCP servers over stdio, launch the bridge as
a child process:

```text
command: /absolute/path/to/node
args:    ["/absolute/path/to/affinity-mcp-server/src/index.js"]
```

Client configuration formats differ. Keep this command and the optional
`AFFINITY_MCP_SSE_URL` environment variable the same when adding the server to
another MCP-compatible agent.
