import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DATABASE, type DatabaseHandle } from "@/database";
import { users } from "@/database/schema";
import type { User } from "@/modules/identity/identity.types";

@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE) private readonly database: DatabaseHandle) {}

  async getById(userId: string): Promise<User | null> {
    const [user] = await this.database.get().select().from(users).where(eq(users.id, userId)).limit(1);
    return user ?? null;
  }

  async delete(userId: string): Promise<boolean> {
    const deleted = await this.database.get().delete(users).where(eq(users.id, userId)).returning({ id: users.id });
    return deleted.length > 0;
  }
}
