import { LangfuseClient } from "@langfuse/client";
import { serverEnv } from "@/shared/config/env";

export function requireLangfuseClient(): LangfuseClient {
  const env = serverEnv();
  if (!env.LANGFUSE_PUBLIC_KEY || !env.LANGFUSE_SECRET_KEY) {
    throw new Error("Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY in .env.local to use Langfuse datasets and experiments.");
  }
  return new LangfuseClient({ publicKey: env.LANGFUSE_PUBLIC_KEY, secretKey: env.LANGFUSE_SECRET_KEY, baseUrl: env.LANGFUSE_BASE_URL });
}
