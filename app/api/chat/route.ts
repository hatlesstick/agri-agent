import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
} from "ai";
import { parseChatRequest } from "@/lib/guardrails/chat-request";
import { BASE_INSTRUCTIONS } from "@/lib/instructions";
import { chatModel, MAX_OUTPUT_TOKENS } from "@/lib/model";

export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  const request = await parseChatRequest(body);
  if (!request.ok) {
    return Response.json({ error: request.error }, { status: request.status });
  }

  const result = streamText({
    model: chatModel(),
    system: BASE_INSTRUCTIONS,
    messages: await convertToModelMessages(request.messages),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
