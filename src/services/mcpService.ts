import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { getAFMTool } from "../tools/afm-mcp.ts";
export const getMCPTools = async () => {
  const client = new MultiServerMCPClient({
    mcpServers: {
      ...getAFMTool(),
    },
    onMessage: (log, source) => {
      console.log(`[${source.server}] ${log.data}`);
    },
    onInitialized: (source) => {
      console.log(`✅ MCP server connected: ${source.server}`);
    },
    onConnectionError: (source, error) => {
      console.error(
        `❌ MCP server failed to connect: ${source.serverName}`,
        error,
      );
      process.exit(1);
    },
  });

  const mcpTools = await client.getTools();

  return [...mcpTools];
};
