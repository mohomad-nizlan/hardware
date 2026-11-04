import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

(async () => {
  const newPass = "admin123";
  const hash = await bcrypt.hash(newPass, 12);
  
  // Update owner password
  await client.execute({
    sql: "UPDATE users SET password_hash = ? WHERE username = 'owner'",
    args: [hash],
  });

  // Update shop_name in settings as well
  await client.execute({
    sql: "UPDATE settings SET value = 'Handyman Hardware' WHERE key = 'shop_name'",
  });

  console.log("Successfully updated password to admin123 and shop_name to Handyman Hardware");
  client.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

