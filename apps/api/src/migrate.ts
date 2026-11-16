import { loadDatabaseUrl } from "@/config";
import { migrateDatabase } from "@/database/migrations";

await migrateDatabase(loadDatabaseUrl());
process.stdout.write("migrations applied\n");
