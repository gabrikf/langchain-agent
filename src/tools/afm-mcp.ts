export const getAFMTool = () => {
  //   const serviceToken = process.env.SERVICE_TOKEN;
  //   if (!serviceToken) {
  //     throw new Error(
  //       "SERVICE_TOKEN environment variable is required for afm-mcp tool",
  //     );
  //   }

  return {
    'afm-mcp': {
      transport: 'http' as const,
      url: 'https://wendi.mcp.staging.birmind.cloud/mcp',
      headers: {
        Authorization: `Bearer ${process.env.SERVICE_TOKEN || 'YOUR_SERVICE_TOKEN'}`,
      },
    },
  };
};
