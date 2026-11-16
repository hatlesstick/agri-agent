import { Module } from "@nestjs/common";
import { IDENTITIES_REPOSITORY, USERS_REPOSITORY } from "@/modules/identity/identity.tokens";
import { IdentitiesRepository } from "@/modules/identity/repositories/IdentitiesRepository";
import { UsersRepository } from "@/modules/identity/repositories/UsersRepository";

@Module({
  providers: [
    { provide: USERS_REPOSITORY, useClass: UsersRepository },
    { provide: IDENTITIES_REPOSITORY, useClass: IdentitiesRepository },
  ],
  exports: [USERS_REPOSITORY, IDENTITIES_REPOSITORY],
})
export class IdentityModule {}
