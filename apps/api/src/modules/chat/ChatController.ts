import { Body, Controller, Inject, Post, Req, Res, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { chatRequestSchema } from "@agri/shared/contracts";
import { problem } from "@/common/errors";
import { abortOnClose, ProxyAuthGuard, RateLimited, RateLimitGuard } from "@/common/http";
import { ApiProblemResponses, openApiSchema } from "@/common/openapi";
import { TelemetryFlushInterceptor } from "@/observability";
import { parseChatRequest } from "@/modules/chat/validation/chat-request";
import { ChatService } from "@/modules/chat/ChatService";
import { CurrentUserId, SessionGuard } from "@/modules/identity";


@ApiTags("chat")
@Controller("chat")
@UseGuards(ProxyAuthGuard, RateLimitGuard, SessionGuard)
@UseInterceptors(TelemetryFlushInterceptor)
export class ChatController {
  constructor(@Inject(ChatService) private readonly chat: ChatService) {}

  @Post()
  @RateLimited("chat")
  @ApiBody({ schema: openApiSchema(chatRequestSchema) })
  @ApiResponse({
    status: 200,
    description: "AI SDK UI message stream (server-sent events). A blocked input is answered with a refusal stream.",
    content: { "text/event-stream": { schema: { type: "string" } } },
  })
  @ApiProblemResponses({ 400: ["invalid_request"], 403: ["forbidden"], 413: ["payload_too_large", "part_too_large", "message_too_long", "conversation_too_long"], 429: ["rate_limited"], 500: ["internal_error"] })
  async reply(@Body() body: unknown, @Req() req: Request, @Res() res: Response, @CurrentUserId() userId: string): Promise<void> {
    const abortSignal = abortOnClose(req, res);
    const request = await parseChatRequest(body);
    if (!request.ok) throw problem(request.error, request.status);
    await this.chat.streamReply({ userId, messages: request.messages, conversationId: request.conversationId, abortSignal }, res);
  }
}
