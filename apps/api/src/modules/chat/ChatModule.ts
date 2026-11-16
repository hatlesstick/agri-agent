import { Module } from "@nestjs/common";
import { AgentBridgeModule } from "@/modules/agent-bridge";
import { ChatController } from "@/modules/chat/ChatController";
import { ChatService } from "@/modules/chat/ChatService";

@Module({
  imports: [AgentBridgeModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
