import type { LanguageModelMiddleware } from "ai";

export const LABEL_REMINDER = "\n\nCheck the application rate on the product label and follow local regulations.";

const UNIT = "(?:l|ml|kg|g|\\u043b|\\u043c\\u043b|\\u043a\\u0433|\\u0433)";
const PER_HECTARE = "(?:ha|\\u0433\\u0430)";
const APPLICATION_RATE = new RegExp(`\\d+(?:[.,]\\d+)?\\s?${UNIT}\\s?\\/\\s?${PER_HECTARE}(?![\\p{L}])`, "iu");

export function mentionsApplicationRate(text: string): boolean {
  return APPLICATION_RATE.test(text);
}

type WrapStream = NonNullable<LanguageModelMiddleware["wrapStream"]>;
type StreamPart = Awaited<ReturnType<WrapStream>>["stream"] extends ReadableStream<infer Part> ? Part : never;

export const labelReminderMiddleware: LanguageModelMiddleware = {
  wrapGenerate: async ({ doGenerate }) => {
    const result = await doGenerate();
    const lastTextIndex = result.content.findLastIndex((part) => part.type === "text");
    const lastText = result.content[lastTextIndex];
    if (!lastText || lastText.type !== "text" || !mentionsApplicationRate(lastText.text)) return result;

    const content = [...result.content];
    content[lastTextIndex] = { ...lastText, text: lastText.text + LABEL_REMINDER };
    return { ...result, content };
  },

  wrapStream: async ({ doStream }) => {
    const { stream, ...rest } = await doStream();
    const texts = new Map<string, string>();

    const transform = new TransformStream<StreamPart, StreamPart>({
      transform(part, controller) {
        if (part.type === "text-delta") texts.set(part.id, (texts.get(part.id) ?? "") + part.delta);
        if (part.type === "text-end" && mentionsApplicationRate(texts.get(part.id) ?? "")) {
          controller.enqueue({ type: "text-delta", id: part.id, delta: LABEL_REMINDER });
        }
        controller.enqueue(part);
      },
    });

    return { stream: stream.pipeThrough(transform), ...rest };
  },
};
