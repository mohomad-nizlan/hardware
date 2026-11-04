import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

(async () => {
  console.log("Cleaning temporary/demo data (keeping user accounts & shop settings intact)...");

  await client.execute("DELETE FROM sale_items");
  await client.execute("DELETE FROM stock_movements");
  await client.execute("DELETE FROM sales");
  await client.execute("DELETE FROM daily_summaries");
  await client.execute("DELETE FROM products");
  await client.execute("UPDATE invoice_counter SET value = 0 WHERE key = 'sales'");

  console.log("✓ All temporary products and sales transactions deleted successfully.");
  console.log("✓ Owner account and shop settings were preserved.");

  client.close();
})().catch((e) => {
  console.error("Failed to clear demo data:", e);
  process.exit(1);
});

