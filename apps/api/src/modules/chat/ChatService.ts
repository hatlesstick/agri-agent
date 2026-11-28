import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ServerResponse } from "node:http";
import { createAgentUIStream, pipeUIMessageStreamToResponse } from "ai";
import { AGENT_PORTS, AGENT_TIMEOUT_MS, chatErrorMessage, createAgriAgent, SCREEN_REFUSAL, screenInput, type AgentPorts } from "@/modules/agent";
import { CLOCK, type Clock } from "@/common/clock";
import { dropBlockedHistory, latestUserText } from "@/modules/chat/validation/chat-request";
import type { ChatReplyInput } from "@/modules/chat/chat.types";
import { refusalStream } from "@/modules/chat/streams/refusal-stream";
import { EMPTY_ANSWER_FALLBACK, withEmptyAnswerFallback } from "@/modules/chat/streams/empty-answer-fallback";
import { withToolOutputGuard } from "@/modules/chat/streams/tool-output-guard";
import { UsageService, type TokenUsage } from "@/modules/usage";

const isBlocked = (text: string) => screenInput(text).verdict === "block";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(AGENT_PORTS) private readonly ports: AgentPorts,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(UsageService) private readonly usage: UsageService,
  ) {}

  async streamReply({ userId, messages, abortSignal }: ChatReplyInput, response: ServerResponse): Promise<void> {
    const screen = screenInput(latestUserText(messages));
    if (screen.verdict === "block") {
      this.logger.warn({ reason: screen.reason, userId }, "guardrail: chat input blocked");
      await pipeUIMessageStreamToResponse({ response, stream: refusalStream(SCREEN_REFUSAL) });
      return;
    }

    const now = this.clock();
    await this.usage.assertWithinDailyLimit(userId, now);
    const stream = await createAgentUIStream({
      agent: createAgriAgent({ ports: this.ports }),
      uiMessages: dropBlockedHistory(messages, isBlocked),
      options: { now, userId },
      abortSignal,
      timeout: AGENT_TIMEOUT_MS,
      onError: chatErrorMessage,
      onStepEnd: ({ usage }) => {
        const step: TokenUsage = { inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0 };
        this.usage.record(userId, now, step).catch((error: unknown) => this.logger.warn({ userId, error: String(error) }, "usage: step not recorded"));
      },
    });
    await pipeUIMessageStreamToResponse({ response, stream: withEmptyAnswerFallback(withToolOutputGuard(stream), EMPTY_ANSWER_FALLBACK) });
  }
}
