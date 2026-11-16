import { describe, expect, it } from "vitest";
import { defaultAgentPorts } from "@/default-ports";
import { jsonRagEngine } from "@/rag/JsonRagEngine";
import { weatherRepository } from "@/weather/WeatherRepository";

describe("defaultAgentPorts", () => {
  it("returns the shared Open-Meteo repository and JSON RAG engine every time", () => {
    expect(defaultAgentPorts().weather).toBe(defaultAgentPorts().weather);
    expect(defaultAgentPorts().weather).toBe(weatherRepository);
    expect(defaultAgentPorts().rag).toBe(jsonRagEngine);
  });
});
