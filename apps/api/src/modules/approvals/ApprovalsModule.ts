import { Module } from "@nestjs/common";
import { IdentityModule } from "@/modules/identity";
import { FieldsModule } from "@/modules/fields";
import { ApprovalsController } from "@/modules/approvals/ApprovalsController";
import { PendingActionsService } from "@/modules/approvals/PendingActionsService";
import { PendingActionsRepository } from "@/modules/approvals/repositories/PendingActionsRepository";

@Module({
  imports: [FieldsModule, IdentityModule],
  controllers: [ApprovalsController],
  providers: [PendingActionsRepository, PendingActionsService],
  exports: [PendingActionsService],
})
export class ApprovalsModule {}
