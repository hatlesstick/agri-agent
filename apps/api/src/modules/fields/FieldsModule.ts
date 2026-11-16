import { Module } from "@nestjs/common";
import { FIELDS_REPOSITORY } from "@/modules/fields/fields.tokens";
import { FieldsRepository } from "@/modules/fields/repositories/FieldsRepository";

@Module({
  providers: [{ provide: FIELDS_REPOSITORY, useClass: FieldsRepository }],
  exports: [FIELDS_REPOSITORY],
})
export class FieldsModule {}
