export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { registerAgentTelemetry } = await import("@/agent");
  const enabled = registerAgentTelemetry();
  console.info(enabled ? "[telemetry] Langfuse tracing enabled" : "[telemetry] Langfuse keys not set, tracing disabled");
}
