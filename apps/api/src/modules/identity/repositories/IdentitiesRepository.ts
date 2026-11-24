import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { TransactionRollbackError } from "drizzle-orm/errors";
import { DATABASE, type DatabaseHandle } from "@/database";
import { identities, users } from "@/database/schema";
import type { FindOrCreateUserInput, FindOrCreateUserResult, IdentityProvider } from "@/modules/identity/identity.types";

@Injectable()
export class IdentitiesRepository {
  constructor(@Inject(DATABASE) private readonly database: DatabaseHandle) {}

  async findOrCreateUser({ provider, externalId, displayName, locale }: FindOrCreateUserInput): Promise<FindOrCreateUserResult> {
    const existing = await this.findUserId(provider, externalId);
    if (existing) return { userId: existing, created: false };

    try {
      const userId = await this.database.get().transaction(async (tx) => {
        const [user] = await tx.insert(users).values({ displayName, locale }).returning({ id: users.id });
        const inserted = await tx
          .insert(identities)
          .values({ userId: user.id, provider, externalId })
          .onConflictDoNothing({ target: [identities.provider, identities.externalId] })
          .returning({ userId: identities.userId });
        if (inserted.length === 0) tx.rollback();
        return user.id;
      });
      return { userId, created: true };
    } catch (error) {
      if (!(error instanceof TransactionRollbackError)) throw error;
      const winner = await this.findUserId(provider, externalId);
      if (!winner) throw error;
      return { userId: winner, created: false };
    }
  }

  async listProviders(userId: string): Promise<string[]> {
    const rows = await this.database.get().selectDistinct({ provider: identities.provider }).from(identities).where(eq(identities.userId, userId));
    return rows.map((row) => row.provider);
  }

  async attach(userId: string, provider: IdentityProvider, externalId: string): Promise<boolean> {
    const inserted = await this.database
      .get()
      .insert(identities)
      .values({ userId, provider, externalId })
      .onConflictDoNothing({ target: [identities.provider, identities.externalId] })
      .returning({ id: identities.id });
    return inserted.length > 0;
  }

  async findUserId(provider: IdentityProvider, externalId: string): Promise<string | null> {
    const [row] = await this.database
      .get()
      .select({ userId: identities.userId })
      .from(identities)
      .where(and(eq(identities.provider, provider), eq(identities.externalId, externalId)))
      .limit(1);
    return row?.userId ?? null;
  }
}
