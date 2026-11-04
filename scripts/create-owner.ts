import { config } from "dotenv";
config({path:".env.local"});
config();
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
const username = (process.env.OWNER_USERNAME || "owner").trim();
const password = process.env.OWNER_PASSWORD || "";
const displayName = (process.env.OWNER_NAME || "Shop Owner").trim();
if(!/^[a-zA-Z0-9._-]{3,32}$/.test(username) || password.length<12){
  console.error("Set OWNER_USERNAME (3-32 characters) and OWNER_PASSWORD (at least 12 characters) in .env.local or environment. Run db:setup first.");
  process.exit(1);
}
const client = createClient({url:process.env.TURSO_DATABASE_URL || "file:local.db",authToken:process.env.TURSO_AUTH_TOKEN || undefined});
(async()=>{
 const existing=await client.execute("SELECT COUNT(*) AS total FROM users");
 if(Number(existing.rows[0].total)>0) throw new Error("Owner setup is allowed ONLY for an empty user database. Manage staff in the app.");
 await client.execute({sql:"INSERT INTO users(id,username,display_name,password_hash,role,active,created_at) VALUES(?,?,?,?,?,?,?)",args:[randomUUID(),username,displayName,await bcrypt.hash(password,12),"owner",1,new Date().toISOString()]});
 console.log(`Owner account created: ${username}. Remove OWNER_PASSWORD from your environment now.`);
 client.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
