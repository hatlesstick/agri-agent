import { Module } from "@nestjs/common";
import { AgentModule } from "@/modules/agent";
import { ChatController } from "@/modules/chat/ChatController";
import { ChatService } from "@/modules/chat/ChatService";

@Module({
  imports: [AgentModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
