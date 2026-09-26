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
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NmIyNjIyMWJmMTM1YjgzOWI5ZGZjNDIiLCJzdWJ0eXBlIjoiZXhwZXJpZW5jZVVzZXIiLCJhcHAiOiI1ZWVkMDEyNmVjNTlhNzAwMDg5MDJiNDUiLCJpc3MiOiJMb3NhbnRFeHBlcmllbmNlIiwiaWF0IjoxNzkwMzg4NDI3fQ.xgTY-NBOtDlQzoZ4QgJ7aNpn2wrDqrrxjn2mTvFZz0k",
      },
    },
  };
};
