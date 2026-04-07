import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "linkedin-prospector-v2", // Nome sugestivo para o projeto
  runtime: "node",
  logLevel: "log",
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
  dirs: ["./src/trigger"],
});
