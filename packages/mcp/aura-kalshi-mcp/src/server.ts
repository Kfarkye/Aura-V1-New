import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "aura-kalshi-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const GET_MARKETS_TOOL: Tool = {
  name: "getMarkets",
  description: "Get active Kalshi markets",
  inputSchema: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Number of markets to return" },
    },
  },
};

const GET_PORTFOLIO_TOOL: Tool = {
  name: "getPortfolio",
  description: "Get user portfolio",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [GET_MARKETS_TOOL, GET_PORTFOLIO_TOOL],
  };
});

/**
 * Executes a secure fetch to Kalshi. If an error occurs, it sanitizes the error 
 * to ensure that KALSHI_API_KEY is not leaked.
 */
async function secureKalshiFetch(endpoint: string) {
  const apiKey = process.env.KALSHI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing KALSHI_API_KEY environment variable");
  }

  try {
    const res = await fetch(`https://api.elections.kalshi.com/trade-api/v2${endpoint}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) {
      throw new Error(`Status ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (error: any) {
    // Anti-leakage assertion: Strip any appearance of the API key from the error message or stack trace
    let errorMessage = error instanceof Error ? error.message : String(error);
    const stackTrace = error instanceof Error ? error.stack : "";

    const secretKeyRegex = new RegExp(apiKey.replace(/[.*+?^$\{\}()|\[\]\\]/g, '\\\\$&'), 'gi');
    
    errorMessage = errorMessage.replace(secretKeyRegex, "***[REDACTED]***");
    let safeStackTrace = stackTrace ? stackTrace.replace(secretKeyRegex, "***[REDACTED]***") : "";
    
    const safeError = new Error(errorMessage);
    if (safeStackTrace) {
      safeError.stack = safeStackTrace;
    }
    
    throw safeError;
  }
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "getMarkets") {
    try {
      const limit = (request.params.arguments?.limit as number) || 10;
      const data = await secureKalshiFetch(`/markets?limit=${limit}`);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Kalshi API Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (request.params.name === "getPortfolio") {
    // GOVERNANCE LOCK
    return {
      content: [
        {
          type: "text",
          text: "GOVERNANCE_BLOCKED: Access to getPortfolio requires explicit interactive user consent because it accesses account-specific financial state. Headless execution is forbidden.",
        },
      ],
      isError: true,
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

export async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Aura Kalshi MCP Server running on stdio");
}

if (import.meta.url === `file://${process.argv[1]}`) {
    run().catch(console.error);
}

// Export for testability
export { secureKalshiFetch, server };
