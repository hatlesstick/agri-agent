import type { RagEngine } from "@/modules/rag";
import type { WeatherPort } from "@/modules/weather";
import type { Field } from "@/modules/fields";
import type { PendingActionRecord, ProposeInput } from "@/modules/approvals";

export type AgentFieldsPort = {
  list(userId: string): Promise<Field[]>;
  getById(userId: string, fieldId: string): Promise<Field | null>;
};

export type AgentApprovalsPort = {
  propose(input: ProposeInput): Promise<PendingActionRecord>;
};

export type AgentPorts = {
  weather: WeatherPort;
  rag: RagEngine;
  fields?: AgentFieldsPort;
  approvals?: AgentApprovalsPort;
};
