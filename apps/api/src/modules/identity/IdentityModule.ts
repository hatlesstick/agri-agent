import { Module } from "@nestjs/common";
import { IDENTITIES_REPOSITORY, SESSIONS_REPOSITORY, USERS_REPOSITORY } from "@/modules/identity/identity.tokens";
import { IdentitiesRepository } from "@/modules/identity/repositories/IdentitiesRepository";
import { SessionsRepository } from "@/modules/identity/repositories/SessionsRepository";
import { UsersRepository } from "@/modules/identity/repositories/UsersRepository";
import { SessionController } from "@/modules/identity/SessionController";
import { SessionGuard } from "@/modules/identity/session/SessionGuard";
import { SessionService } from "@/modules/identity/session/SessionService";

@Module({
  controllers: [SessionController],
  providers: [
    { provide: USERS_REPOSITORY, useClass: UsersRepository },
    { provide: IDENTITIES_REPOSITORY, useClass: IdentitiesRepository },
    { provide: SESSIONS_REPOSITORY, useClass: SessionsRepository },
    SessionService,
    SessionGuard,
  ],
  exports: [USERS_REPOSITORY, IDENTITIES_REPOSITORY, SESSIONS_REPOSITORY, SessionService, SessionGuard],
})
export class IdentityModule {}
