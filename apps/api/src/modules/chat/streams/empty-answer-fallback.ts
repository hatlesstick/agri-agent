import type { UIMessageChunk } from "ai";

export const EMPTY_ANSWER_FALLBACK = "Не вдалося сформулювати відповідь. Спробуйте ще раз. / I could not form an answer. Please ask again.";

export function withEmptyAnswerFallback(stream: ReadableStream<UIMessageChunk>, fallback: string): ReadableStream<UIMessageChunk> {
  let sawText = false;
  let finish: UIMessageChunk | undefined;
  return stream.pipeThrough(
    new TransformStream<UIMessageChunk, UIMessageChunk>({
      transform(chunk, controller) {
        if (chunk.type === "text-delta") sawText = true;
        if (chunk.type === "finish") {
          finish = chunk;
          return;
        }
        controller.enqueue(chunk);
      },
      flush(controller) {
        if (!finish) return;
        if (!sawText) {
          const id = "empty-answer-fallback";
          controller.enqueue({ type: "text-start", id });
          controller.enqueue({ type: "text-delta", id, delta: fallback });
          controller.enqueue({ type: "text-end", id });
        }
        controller.enqueue(finish);
      },
    }),
  );
}
