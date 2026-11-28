import { Module } from "@nestjs/common";
import { IdentityModule } from "@/modules/identity";
import { ConversationsController } from "@/modules/conversations/ConversationsController";
import { ConversationsService } from "@/modules/conversations/ConversationsService";
import { ConversationsRepository } from "@/modules/conversations/repositories/ConversationsRepository";

@Module({
  imports: [IdentityModule],
  controllers: [ConversationsController],
  providers: [ConversationsRepository, ConversationsService],
})
export class ConversationsModule {}
