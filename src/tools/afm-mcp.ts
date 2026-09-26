export const getAFMTool = () => {
  //   const serviceToken = process.env.SERVICE_TOKEN;
  //   if (!serviceToken) {
  //     throw new Error(
  //       "SERVICE_TOKEN environment variable is required for afm-mcp tool",
  //     );
  //   }

  return {
    "afm-mcp": {
      transport: "http" as const,
      url: "https://wendi.mcp.staging.birmind.cloud/mcp",
      headers: {
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzJjYTg3Nzk0NGYwN2RlZjFiMDNhNmMiLCJzdWJ0eXBlIjoiZXhwZXJpZW5jZVVzZXIiLCJhcHAiOiI1ZWVkMDEyNmVjNTlhNzAwMDg5MDJiNDUiLCJpc3MiOiJMb3NhbnRFeHBlcmllbmNlIiwiaWF0IjoxNzkwNDI2NTA3fQ.be0w0TRS9mMi4k24uvb9b6DgF9ju7HfqHeb9NF5vINA",
      },
    },
  };
};
