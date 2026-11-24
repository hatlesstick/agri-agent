import { Inject, Injectable } from "@nestjs/common";
import { API_ENV, type ApiEnv } from "@/config";
import { IDENTITIES_REPOSITORY, USERS_REPOSITORY } from "@/modules/identity/identity.tokens";
import type { IdentitiesPort, IdentityProvider, UsersPort } from "@/modules/identity/identity.types";
import { SessionService } from "@/modules/identity/session/SessionService";
import type { OAuthOutcome, OAuthProvider, ProviderIdentity } from "@/modules/identity/auth/auth.types";
import { decodeFlowCookie, safeReturnPath, sameValue } from "@/modules/identity/auth/oauth-flow";

export type AuthorizeQuery = { code?: string; state?: string; error?: string };

@Injectable()
export class OAuthService {
  constructor(
    @Inject(IDENTITIES_REPOSITORY) private readonly identities: IdentitiesPort,
    @Inject(USERS_REPOSITORY) private readonly users: UsersPort,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(API_ENV) private readonly env: ApiEnv,
  ) {}

  precheck(provider: OAuthProvider, query: AuthorizeQuery, flowCookie: string | undefined): OAuthOutcome | undefined {
    const flow = decodeFlowCookie(flowCookie);
    if (!flow || flow.provider !== provider || !query.state || !sameValue(flow.state, query.state)) return { ok: false, code: "state_mismatch" };
    if (query.error) return { ok: false, code: query.error === "access_denied" ? "cancelled" : "provider_error" };
    if (!query.code) return { ok: false, code: "provider_error" };
    return undefined;
  }

  async complete(provider: OAuthProvider, identity: ProviderIdentity, sessionToken: string | undefined, returnTo: string | undefined): Promise<OAuthOutcome> {
    const visitor = await this.sessions.resolve(sessionToken);
    const owner = await this.ownerOf(provider, identity.providerUserId, visitor.userId);
    await this.users.updateProfile(owner, { displayName: identity.displayName, avatarUrl: identity.avatarUrl });
    const token = await this.sessions.rotate(sessionToken, owner);
    return { ok: true, sessionToken: token, returnTo: safeReturnPath(returnTo) };
  }

  appUrl(path: string): string {
    return this.env.PUBLIC_APP_ORIGIN ? `${this.env.PUBLIC_APP_ORIGIN}${path}` : path;
  }

  private async ownerOf(provider: IdentityProvider, providerUserId: string, visitorId: string): Promise<string> {
    const existing = await this.identities.findUserId(provider, providerUserId);
    if (existing) return existing;
    if (await this.isAnonymous(visitorId) && (await this.identities.attach(visitorId, provider, providerUserId))) return visitorId;
    return (await this.identities.findOrCreateUser({ provider, externalId: providerUserId })).userId;
  }

  private async isAnonymous(userId: string): Promise<boolean> {
    const providers = await this.identities.listProviders(userId);
    return !providers.some((provider) => provider === "github" || provider === "google");
  }
}
