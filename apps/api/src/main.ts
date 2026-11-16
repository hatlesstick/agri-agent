import "reflect-metadata";
import { registerAgentTelemetry } from "@/observability";
import { loadApiEnv } from "@/config";
import { createApp } from "@/bootstrap/create-app";

registerAgentTelemetry();
const env = loadApiEnv();
const app = await createApp(env);
await app.listen(env.PORT);
