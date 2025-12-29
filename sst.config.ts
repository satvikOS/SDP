/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "ai-foresight-platform",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    // Deploy Next.js app to AWS Lambda + CloudFront
    const web = new sst.aws.Nextjs("AiForesightWeb", {
      path: "frontend/web-app",
      environment: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "https://33kvywy84h.execute-api.us-east-1.amazonaws.com",
      },
    });

    return {
      url: web.url,
    };
  },
});
