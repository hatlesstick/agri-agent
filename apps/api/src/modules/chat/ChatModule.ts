import { Module } from "@nestjs/common";
import { AgentModule } from "@/modules/agent";
import { IdentityModule } from "@/modules/identity";
import { ChatController } from "@/modules/chat/ChatController";
import { ChatService } from "@/modules/chat/ChatService";

@Module({
  imports: [AgentModule, IdentityModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
