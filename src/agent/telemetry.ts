import { OpenTelemetry } from "@ai-sdk/otel";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { registerTelemetry } from "ai";
import { serverEnv } from "@/config/env";

type TelemetryOptions = { exportMode?: "immediate" | "batched"; environment?: string };

let spanProcessor: LangfuseSpanProcessor | null = null;

export function isTelemetryEnabled(): boolean {
  return spanProcessor !== null;
}

export function registerAgentTelemetry(options: TelemetryOptions = {}): boolean {
  if (spanProcessor) return true;

  const env = serverEnv();
  if (!env.LANGFUSE_PUBLIC_KEY || !env.LANGFUSE_SECRET_KEY) return false;

  spanProcessor = new LangfuseSpanProcessor({
    publicKey: env.LANGFUSE_PUBLIC_KEY,
    secretKey: env.LANGFUSE_SECRET_KEY,
    baseUrl: env.LANGFUSE_BASE_URL,
    environment: options.environment ?? env.LANGFUSE_ENVIRONMENT,
    exportMode: options.exportMode ?? "batched",
  });
  new NodeTracerProvider({ spanProcessors: [spanProcessor] }).register();
  registerTelemetry(new OpenTelemetry());
  return true;
}

export async function flushAgentTelemetry(): Promise<void> {
  await spanProcessor?.forceFlush();
}
