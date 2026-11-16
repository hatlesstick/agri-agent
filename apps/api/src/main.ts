import "reflect-metadata";
import { registerAgentTelemetry } from "@agri/agent";
import { loadApiEnv } from "@/config";
import { createApp } from "@/create-app";

registerAgentTelemetry();
const env = loadApiEnv();
const app = await createApp(env);
await app.listen(env.PORT);
