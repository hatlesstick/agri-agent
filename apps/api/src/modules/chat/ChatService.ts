import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ServerResponse } from "node:http";
import { pipeAgentUIStreamToResponse, pipeUIMessageStreamToResponse } from "ai";
import { AGENT_PORTS, AGENT_TIMEOUT_MS, chatErrorMessage, createAgriAgent, SCREEN_REFUSAL, screenInput, type AgentPorts } from "@/modules/agent";
import { CLOCK, type Clock } from "@/common/clock";
import { dropBlockedHistory, latestUserText } from "@/modules/chat/validation/chat-request";
import type { ChatReplyInput } from "@/modules/chat/chat.types";
import { refusalStream } from "@/modules/chat/streams/refusal-stream";

const isBlocked = (text: string) => screenInput(text).verdict === "block";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(AGENT_PORTS) private readonly ports: AgentPorts,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async streamReply({ messages, abortSignal }: ChatReplyInput, response: ServerResponse): Promise<void> {
    const screen = screenInput(latestUserText(messages));
    if (screen.verdict === "block") {
      this.logger.warn({ reason: screen.reason }, "guardrail: chat input blocked");
      await pipeUIMessageStreamToResponse({ response, stream: refusalStream(SCREEN_REFUSAL) });
      return;
    }

    await pipeAgentUIStreamToResponse({
      response,
      agent: createAgriAgent({ ports: this.ports }),
      uiMessages: dropBlockedHistory(messages, isBlocked),
      options: { now: this.clock() },
      abortSignal,
      timeout: AGENT_TIMEOUT_MS,
      onError: chatErrorMessage,
    });
  }
}
