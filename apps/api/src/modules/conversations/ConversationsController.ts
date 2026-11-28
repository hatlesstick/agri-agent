import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { renameConversationSchema, type Conversation, type ConversationsPage } from "@agri/shared/contracts";
import { CLOCK, type Clock } from "@/common/clock";
import { problem } from "@/common/errors";
import { ProxyAuthGuard, RateLimited, RateLimitGuard } from "@/common/http";
import { CurrentUserId, SessionGuard } from "@/modules/identity";
import { ConversationsService } from "@/modules/conversations/ConversationsService";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireId(id: string): void {
  if (!UUID.test(id)) throw problem("not_found", 404);
}

@ApiTags("conversations")
@Controller("conversations")
@UseGuards(ProxyAuthGuard, RateLimitGuard, SessionGuard)
export class ConversationsController {
  constructor(
    @Inject(ConversationsService) private readonly conversations: ConversationsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Get()
  @RateLimited("session")
  list(@CurrentUserId() userId: string, @Query("cursor") cursor?: string): Promise<ConversationsPage> {
    const before = cursor ? new Date(cursor) : null;
    if (before && Number.isNaN(before.getTime())) throw problem("invalid_request", 400);
    return this.conversations.list(userId, before);
  }

  @Post()
  @RateLimited("session")
  create(@CurrentUserId() userId: string): Promise<Conversation> {
    return this.conversations.create(userId, this.clock());
  }

  @Get(":id")
  @RateLimited("session")
  async get(@CurrentUserId() userId: string, @Param("id") id: string): Promise<Conversation> {
    requireId(id);
    const found = await this.conversations.find(userId, id);
    if (!found) throw problem("not_found", 404);
    return found;
  }

  @Patch(":id")
  @RateLimited("session")
  async rename(@CurrentUserId() userId: string, @Param("id") id: string, @Body() body: unknown): Promise<Conversation> {
    requireId(id);
    const parsed = renameConversationSchema.safeParse(body);
    if (!parsed.success) throw problem("invalid_request", 400);
    const renamed = await this.conversations.rename(userId, id, parsed.data.title, this.clock());
    if (!renamed) throw problem("not_found", 404);
    return renamed;
  }

  @Delete(":id")
  @HttpCode(204)
  @RateLimited("session")
  async remove(@CurrentUserId() userId: string, @Param("id") id: string): Promise<void> {
    requireId(id);
    if (!(await this.conversations.remove(userId, id))) throw problem("not_found", 404);
  }
}
