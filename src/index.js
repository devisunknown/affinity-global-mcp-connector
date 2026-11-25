import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const SERVER_NAME = "affinity-mcp-bridge";
const SERVER_VERSION = "0.1.0";
const DEFAULT_AFFINITY_URL = "http://localhost:6767/sse";
const STATUS_TOOL = {
  name: "affinity_bridge_status",
  description:
    "Check whether Affinity's local MCP server is reachable and report its available tool count.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
};

let upstreamClient;
let upstreamConnectPromise;

function affinityUrl() {
  const raw = process.env.AFFINITY_MCP_SSE_URL || DEFAULT_AFFINITY_URL;
  const url = new URL(raw);
  const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new Error("Affinity MCP URL must use HTTP or HTTPS.");
  }
  if (!loopbackHosts.has(url.hostname)) {
    throw new Error(
      "For safety, the bridge only connects to a loopback Affinity MCP server.",
    );
  }

  return url;
}

async function connectAffinity() {
  if (upstreamClient) return upstreamClient;
  if (upstreamConnectPromise) return upstreamConnectPromise;

  upstreamConnectPromise = (async () => {
    const client = new Client(
      { name: SERVER_NAME, version: SERVER_VERSION },
      { capabilities: {} },
    );
    const transport = new SSEClientTransport(affinityUrl());

    client.onclose = () => {
      if (upstreamClient === client) upstreamClient = undefined;
    };
    await client.connect(transport);
    upstreamClient = client;
    return client;
  })();

  try {
    return await upstreamConnectPromise;
  } finally {
    upstreamConnectPromise = undefined;
  }
}

async function closeAffinity() {
  const client = upstreamClient;
  upstreamClient = undefined;
  if (client) await client.close().catch(() => {});
}

async function statusResult() {
  try {
    const client = await connectAffinity();
    const { tools = [] } = await client.listTools();
    return {
      content: [
        {
          type: "text",
          text: `Affinity is reachable. ${tools.length} Affinity tool(s) are available.`,
        },
      ],
    };
  } catch (error) {
    await closeAffinity();
    return {
      content: [
        {
          type: "text",
          text: `Affinity is not reachable at ${process.env.AFFINITY_MCP_SSE_URL || DEFAULT_AFFINITY_URL}. Open Affinity, enable its MCP server, restart the app if requested, and retry. Details: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

const server = new Server(
  { name: SERVER_NAME, version: SERVER_VERSION },
  { capabilities: { tools: { listChanged: false } } },
);

server.onerror = (error) => {
  // stdout is reserved for MCP JSON-RPC messages.
  console.error("[affinity-mcp-bridge]", error);
};

server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    const client = await connectAffinity();
    const { tools = [] } = await client.listTools();
    return {
      tools: [STATUS_TOOL, ...tools.filter((tool) => tool.name !== STATUS_TOOL.name)],
    };
  } catch {
    await closeAffinity();
    return { tools: [STATUS_TOOL] };
  }
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  if (name === STATUS_TOOL.name) return statusResult();

  const client = await connectAffinity();
  try {
    return await client.callTool({ name, arguments: args });
  } catch (error) {
    await closeAffinity();
    throw error;
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    await closeAffinity();
    await server.close().catch(() => {});
    process.exit(0);
  });
}
