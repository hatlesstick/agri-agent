import { loadApiEnv } from "@/config";
import { migrateDatabase } from "@/database/migrations";

await migrateDatabase(loadApiEnv().DATABASE_URL);
process.stdout.write("migrations applied\n");
