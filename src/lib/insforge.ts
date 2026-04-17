import { createClient } from "@insforge/sdk";

let serverClient: ReturnType<typeof createClient> | null = null;
let serverClientConfig: { baseUrl: string; anonKey: string } | null = null;

function getInsforgeConfig() {
  const baseUrl = "https://9s8ct2b5.us-east.insforge.app";
  const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDEzNjl9.Cm7dzmsTq0k1LYT2n9R-S2LgnRBG1vOTsZoJ9R8DNXY";

  if (!baseUrl || !anonKey) {
    throw new Error(
      "Missing InsForge configuration. Set NEXT_PUBLIC_INSFORGE_URL and NEXT_PUBLIC_INSFORGE_ANON_KEY.",
    );
  }

  return { baseUrl, anonKey };
}

export function createInsforgeServerClient(options?: { accessToken?: string }) {
  const { baseUrl, anonKey } = getInsforgeConfig();

  return createClient({
    baseUrl,
    anonKey,
    isServerMode: true,
    ...(options?.accessToken ? { edgeFunctionToken: options.accessToken } : {}),
  });
}

export function getInsforgeServerClient() {
  const config = getInsforgeConfig();

  if (
    !serverClient ||
    !serverClientConfig ||
    serverClientConfig.baseUrl !== config.baseUrl ||
    serverClientConfig.anonKey !== config.anonKey
  ) {
    serverClient = createInsforgeServerClient();
    serverClientConfig = config;
  }

  return serverClient;
}
