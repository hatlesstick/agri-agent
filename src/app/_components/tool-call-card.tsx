import type { AgroAgentUIMessage } from "@/agent";

type MessagePart = AgroAgentUIMessage["parts"][number];
export type ToolPart = Extract<MessagePart, { type: `tool-${string}` }>;

const STATE_LABEL: Record<ToolPart["state"], string> = {
  "input-streaming": "preparing…",
  "input-available": "running…",
  "output-available": "done",
  "output-error": "failed",
  "output-denied": "denied",
  "approval-requested": "waiting for approval",
  "approval-responded": "approved",
};

const REASON_LABEL: Record<string, string> = {
  wind_too_low: "wind too low",
  wind_too_high: "wind too strong",
  too_cold: "too cold",
  too_hot: "too hot",
  precipitation_nearby: "rain nearby",
  humidity_too_low: "humidity too low",
  insufficient_data: "missing data",
};

export function isToolPart(part: MessagePart): part is ToolPart {
  return part.type.startsWith("tool-");
}

function toolName(part: ToolPart): string {
  return part.type.slice("tool-".length);
}

function formatTime(value: string): string {
  return value.replace("T", " ");
}

function errorOf(output: unknown): string | null {
  return output && typeof output === "object" && "error" in output ? String(output.error) : null;
}

function SprayWindowSummary({ output }: { output: Extract<ToolPart, { type: "tool-sprayWindow" }>["output"] }) {
  if (!output || "error" in output) return null;
  const reasons = Object.entries(output.rejectedReasons)
    .sort(([, left], [, right]) => (right ?? 0) - (left ?? 0))
    .map(([reason, hours]) => `${REASON_LABEL[reason] ?? reason} (${hours} h)`);

  return (
    <div className="space-y-1">
      <p className="font-medium">
        {output.canSpray ? "✅ Spraying possible" : "❌ No suitable window"} · {output.city}, {output.date}
      </p>
      {output.bestWindow && (
        <p>
          Best window: {formatTime(output.bestWindow.from)} → {formatTime(output.bestWindow.to)} ({output.bestWindow.hours} h,{" "}
          {output.timezone})
        </p>
      )}
      {reasons.length > 0 && <p className="text-zinc-600">Rejected hours: {reasons.join(", ")}</p>}
    </div>
  );
}

function SprayOutlookSummary({ output }: { output: Extract<ToolPart, { type: "tool-sprayOutlook" }>["output"] }) {
  if (!output || "error" in output) return null;
  return (
    <ul className="space-y-1">
      {output.days.map((day) => (
        <li key={day.date}>
          {day.canSpray ? "✅" : "❌"} {day.date}
          {day.bestWindow ? ` · ${formatTime(day.bestWindow.from)} → ${formatTime(day.bestWindow.to)} (${day.bestWindow.hours} h)` : " · no window"}
        </li>
      ))}
      <li className="text-zinc-500">
        {output.city}, {output.timezone}
      </li>
    </ul>
  );
}

function SearchDocsSummary({ output }: { output: Extract<ToolPart, { type: "tool-searchDocs" }>["output"] }) {
  if (!output || "error" in output) return null;
  if (output.hits.length === 0) return <p className="text-zinc-600">📚 No relevant passages found</p>;
  return (
    <ul className="space-y-1">
      {output.hits.map((hit) => (
        <li key={hit.id}>
          📚 {hit.title} — {hit.heading} <span className="text-zinc-500">({hit.score.toFixed(2)})</span>
          <div className="text-xs text-zinc-500">{hit.source}</div>
        </li>
      ))}
    </ul>
  );
}

function GetWeatherSummary({ output }: { output: Extract<ToolPart, { type: "tool-getWeather" }>["output"] }) {
  if (!output || "error" in output) return null;
  const first = output.hourly[0];
  return (
    <p>
      🌤 {output.city}, {output.country} · {output.hourly.length} hours from {first ? formatTime(first.time) : "—"} ({output.timezone})
      {first && first.temperature !== null && ` · now ${first.temperature} °C, wind ${first.windSpeed ?? "—"} m/s`}
    </p>
  );
}

function OutputSummary({ part }: { part: ToolPart }) {
  if (part.state !== "output-available") return null;
  const error = errorOf(part.output);
  if (error) return <p className="text-amber-700">⚠️ {error.replaceAll("_", " ")}</p>;
  if (part.type === "tool-sprayWindow") return <SprayWindowSummary output={part.output} />;
  if (part.type === "tool-getWeather") return <GetWeatherSummary output={part.output} />;
  if (part.type === "tool-sprayOutlook") return <SprayOutlookSummary output={part.output} />;
  if (part.type === "tool-searchDocs") return <SearchDocsSummary output={part.output} />;
  return null;
}

export function ToolCallCard({ part }: { part: ToolPart }) {
  const inputEntries = part.input && typeof part.input === "object" ? Object.entries(part.input) : [];
  const failed = part.state === "output-error";

  return (
    <div className={`my-2 rounded-md border bg-white p-3 text-sm ${failed ? "border-red-300" : "border-zinc-200"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono font-semibold">🔧 {toolName(part)}</span>
        <span className={`rounded px-2 py-0.5 text-xs ${failed ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-600"}`}>
          {STATE_LABEL[part.state]}
        </span>
      </div>

      {inputEntries.length > 0 && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 font-mono text-xs text-zinc-600">
          {inputEntries.map(([key, value]) => (
            <div key={key} className="contents">
              <dt>{key}</dt>
              <dd>{JSON.stringify(value)}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-2">
        <OutputSummary part={part} />
        {failed && <p className="text-red-700">{part.errorText}</p>}
      </div>

      {part.state === "output-available" && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-zinc-500">Raw output</summary>
          <pre className="mt-1 max-h-48 overflow-auto rounded bg-zinc-50 p-2 text-xs">{JSON.stringify(part.output, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
