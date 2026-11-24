import { Inject, Injectable } from "@nestjs/common";
import type { MeResponse } from "@agri/shared/contracts";
import { problem } from "@/common/errors";
import { IDENTITIES_REPOSITORY, USERS_REPOSITORY } from "@/modules/identity/identity.tokens";
import type { IdentitiesPort, UsersPort } from "@/modules/identity/identity.types";

const SIGN_IN_PROVIDERS: ReadonlyArray<MeResponse["providers"][number]> = ["github", "google"];
const VISIBLE_PROVIDERS: ReadonlyArray<MeResponse["providers"][number]> = ["web", "github", "google"];

@Injectable()
export class AccountService {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersPort,
    @Inject(IDENTITIES_REPOSITORY) private readonly identities: IdentitiesPort,
  ) {}

  async describe(userId: string): Promise<MeResponse> {
    const user = await this.users.getById(userId);
    if (!user) throw problem("not_found", 404);
    const providers = (await this.identities.listProviders(userId)).filter((provider): provider is MeResponse["providers"][number] => VISIBLE_PROVIDERS.some((visible) => visible === provider));
    return {
      userId: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      providers,
      signedIn: providers.some((provider) => SIGN_IN_PROVIDERS.includes(provider)),
    };
  }
}
