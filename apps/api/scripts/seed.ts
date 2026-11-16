import "reflect-metadata";
import { loadDatabaseUrl } from "@/config";
import { LazyDatabase } from "@/database";
import { FieldsRepository, type NewField } from "@/modules/fields";
import { IdentitiesRepository } from "@/modules/identity";

const DEMO_FIELDS: NewField[] = [
  { name: "Wheat near Lyon", crop: "wheat", lat: 45.76, lon: 4.84, areaHa: "12.50", notes: "Demo field" },
  { name: "Rapeseed near Lutsk", crop: "rapeseed", lat: 50.75, lon: 25.33, areaHa: "8.00", notes: "Demo field" },
];

const database = new LazyDatabase(loadDatabaseUrl());
try {
  const { userId, created } = await new IdentitiesRepository(database).findOrCreateUser({ provider: "web", externalId: "demo", displayName: "Demo farmer", locale: "en" });
  const fields = new FieldsRepository(database);
  let createdFields = 0;
  for (const field of DEMO_FIELDS) {
    if (await fields.findByName(userId, field.name)) continue;
    await fields.create(userId, field);
    createdFields += 1;
  }
  process.stdout.write(`demo user ${created ? "created" : "exists"} (${userId}); fields created: ${createdFields}\n`);
} finally {
  await database.close();
}
