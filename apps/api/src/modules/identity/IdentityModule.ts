import { Module } from "@nestjs/common";
import { IDENTITIES_REPOSITORY, SESSIONS_REPOSITORY, USERS_REPOSITORY } from "@/modules/identity/identity.tokens";
import { IdentitiesRepository } from "@/modules/identity/repositories/IdentitiesRepository";
import { SessionsRepository } from "@/modules/identity/repositories/SessionsRepository";
import { UsersRepository } from "@/modules/identity/repositories/UsersRepository";
import { AuthController } from "@/modules/identity/AuthController";
import { AccountService } from "@/modules/identity/AccountService";
import { MeController } from "@/modules/identity/MeController";
import { OAUTH_RUNTIME } from "@/modules/identity/auth/auth.tokens";
import { OAuthService } from "@/modules/identity/auth/OAuthService";
import { createOAuthRuntime } from "@/modules/identity/auth/passport-strategies";
import type { ApiEnv } from "@/config";
import { API_ENV } from "@/config";
import { SessionController } from "@/modules/identity/SessionController";
import { SessionGuard } from "@/modules/identity/session/SessionGuard";
import { SessionService } from "@/modules/identity/session/SessionService";

@Module({
  controllers: [SessionController, AuthController, MeController],
  providers: [
    { provide: USERS_REPOSITORY, useClass: UsersRepository },
    { provide: IDENTITIES_REPOSITORY, useClass: IdentitiesRepository },
    { provide: SESSIONS_REPOSITORY, useClass: SessionsRepository },
    SessionService,
    SessionGuard,
    OAuthService,
    AccountService,
    { provide: OAUTH_RUNTIME, inject: [API_ENV], useFactory: (env: ApiEnv) => createOAuthRuntime(env) },
  ],
  exports: [USERS_REPOSITORY, IDENTITIES_REPOSITORY, SESSIONS_REPOSITORY, SessionService, SessionGuard],
})
export class IdentityModule {}
