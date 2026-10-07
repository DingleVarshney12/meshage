import "reflect-metadata";
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DataSource } from "typeorm";

const apiRoot = resolve(__dirname, "../..");

config({ path: resolve(apiRoot, "../../.env") });

const databaseUrl = process.env.DATABASE_URL;
const caFile = process.env.SUPABASE_DB_CA_FILE;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing from the root .env file.");
}

if (!caFile) {
  throw new Error("SUPABASE_DB_CA_FILE is missing from the root .env file.");
}

const databaseCa = readFileSync(resolve(apiRoot, caFile), "utf8");

const dataSource = new DataSource({
  type: "postgres",
  url: databaseUrl,
  ssl: {
    ca: databaseCa,
    rejectUnauthorized: true,
  },
  entities: [resolve(__dirname, "entities/*{.ts,.js}")],
  migrations: [resolve(__dirname, "migrations/*{.ts,.js}")],
  synchronize: false,
  migrationsRun: false,
});

export default dataSource;
