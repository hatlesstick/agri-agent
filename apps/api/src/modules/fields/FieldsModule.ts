import { Module } from "@nestjs/common";
import { IdentityModule } from "@/modules/identity";
import { FieldsController } from "@/modules/fields/FieldsController";
import { FieldsService } from "@/modules/fields/FieldsService";
import { FIELDS_REPOSITORY } from "@/modules/fields/fields.tokens";
import { FieldsRepository } from "@/modules/fields/repositories/FieldsRepository";

@Module({
  imports: [IdentityModule],
  controllers: [FieldsController],
  providers: [{ provide: FIELDS_REPOSITORY, useClass: FieldsRepository }, FieldsService],
  exports: [FIELDS_REPOSITORY],
})
export class FieldsModule {}
