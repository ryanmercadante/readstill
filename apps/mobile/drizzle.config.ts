import { defineConfig } from "drizzle-kit";

// Generates SQL migrations from src/storage/schema.ts, plus drizzle/migrations.js,
// which bundles them for the app's expo-sqlite migrator.
export default defineConfig({
  dialect: "sqlite",
  driver: "expo",
  schema: "./src/storage/schema.ts",
  out: "./drizzle",
});
