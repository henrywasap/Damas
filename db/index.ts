import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set; API will fall back to in-memory storage.");
}

export const db = drizzle({
  client: neon(connectionString ?? "postgresql://invalid:invalid@localhost/invalid"),
  schema,
});
export { schema };
