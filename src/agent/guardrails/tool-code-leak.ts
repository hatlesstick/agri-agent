import type { LanguageModelMiddleware } from "ai";

export const TOOL_CODE_FALLBACK = "I could not run the weather check this time. Please ask again.";

const LEAK_PATTERN = /(?:^|\n)\s*(?:<|```)?\s*tool_code\b|\btool_code\s*[:(]|default_api\.\w+\(/i;
const TAIL_CHARS = 40;
const DECISION_CHARS = 40;

export function looksLikeLeakedToolCode(text: string): boolean {
  return LEAK_PATTERN.test(text);
}

type WrapStream = NonNullable<LanguageModelMiddleware["wrapStream"]>;
type StreamPart = Awaited<ReturnType<WrapStream>>["stream"] extends ReadableStream<infer Part> ? Part : never;

type BlockState = { buffer: string; tail: string; decided: "pending" | "pass" | "leak" };

export const toolCodeLeakMiddleware: LanguageModelMiddleware = {
  wrapGenerate: async ({ doGenerate }) => {
    const result = await doGenerate();
    if (!result.content.some((part) => part.type === "text" && looksLikeLeakedToolCode(part.text))) return result;
    console.warn("guardrail: leaked tool_code text replaced");
    return {
      ...result,
      content: result.content.map((part) =>
        part.type === "text" && looksLikeLeakedToolCode(part.text) ? { ...part, text: TOOL_CODE_FALLBACK } : part,
      ),
    };
  },

  wrapStream: async ({ doStream }) => {
    const { stream, ...rest } = await doStream();
    const blocks = new Map<string, BlockState>();

    const decide = (id: string, state: BlockState, controller: TransformStreamDefaultController<StreamPart>) => {
      if (looksLikeLeakedToolCode(state.buffer)) {
        console.warn("guardrail: leaked tool_code text replaced");
        state.decided = "leak";
        controller.enqueue({ type: "text-delta", id, delta: TOOL_CODE_FALLBACK });
      } else {
        state.decided = "pass";
        state.tail = state.buffer.slice(-TAIL_CHARS);
        if (state.buffer) controller.enqueue({ type: "text-delta", id, delta: state.buffer });
      }
      state.buffer = "";
    };

    const transform = new TransformStream<StreamPart, StreamPart>({
      transform(part, controller) {
        if (part.type === "text-start") blocks.set(part.id, { buffer: "", tail: "", decided: "pending" });

        if (part.type === "text-delta") {
          const state = blocks.get(part.id);
          if (!state) return controller.enqueue(part);
          if (state.decided === "leak") return;
          if (state.decided === "pass") {
            const window = state.tail + part.delta;
            if (looksLikeLeakedToolCode(window)) {
              console.warn("guardrail: leaked tool_code text replaced");
              state.decided = "leak";
              return controller.enqueue({ type: "text-delta", id: part.id, delta: `\n\n${TOOL_CODE_FALLBACK}` });
            }
            state.tail = window.slice(-TAIL_CHARS);
            return controller.enqueue(part);
          }
          state.buffer += part.delta;
          if (state.buffer.length >= DECISION_CHARS) decide(part.id, state, controller);
          return;
        }

        if (part.type === "text-end") {
          const state = blocks.get(part.id);
          if (state?.decided === "pending") decide(part.id, state, controller);
          blocks.delete(part.id);
        }

        controller.enqueue(part);
      },
    });

    return { stream: stream.pipeThrough(transform), ...rest };
  },
};
