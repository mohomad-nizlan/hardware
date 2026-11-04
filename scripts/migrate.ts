import { config } from "dotenv";
config({path:".env.local"});
config();
import { createClient } from "@libsql/client";
const client = createClient({url: process.env.TURSO_DATABASE_URL || "file:local.db", authToken:process.env.TURSO_AUTH_TOKEN || undefined});
const statements = [
`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL COLLATE NOCASE UNIQUE, display_name TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('owner','manager','cashier')), active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL)`,
`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
`CREATE TABLE IF NOT EXISTS login_attempts (username TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0, locked_until TEXT)`,
`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, code TEXT NOT NULL COLLATE NOCASE UNIQUE, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'General', unit TEXT NOT NULL DEFAULT 'pcs', buy_price INTEGER NOT NULL CHECK(buy_price >= 0), price INTEGER NOT NULL CHECK(price >= 0), stock_milli INTEGER NOT NULL DEFAULT 0 CHECK(stock_milli >= 0), reorder_milli INTEGER NOT NULL DEFAULT 5000 CHECK(reorder_milli >= 0), active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
`CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`,
`CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, invoice_no TEXT NOT NULL UNIQUE, cashier_id TEXT REFERENCES users(id) ON DELETE SET NULL, subtotal INTEGER NOT NULL, discount INTEGER NOT NULL, total INTEGER NOT NULL, cost INTEGER NOT NULL, tendered INTEGER NOT NULL, change_due INTEGER NOT NULL, payment_method TEXT NOT NULL, receipt_json TEXT NOT NULL, created_at TEXT NOT NULL)`,
`CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at)`,
`CREATE TABLE IF NOT EXISTS sale_items (id TEXT PRIMARY KEY, sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE, product_id TEXT REFERENCES products(id) ON DELETE SET NULL, code TEXT NOT NULL, name TEXT NOT NULL, unit TEXT NOT NULL, qty_milli INTEGER NOT NULL, unit_price INTEGER NOT NULL, line_total INTEGER NOT NULL)`,
`CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id)`,
`CREATE TABLE IF NOT EXISTS stock_movements (id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id), type TEXT NOT NULL, qty_diff_milli INTEGER NOT NULL, note TEXT NOT NULL DEFAULT '', user_id TEXT REFERENCES users(id) ON DELETE SET NULL, sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL, created_at TEXT NOT NULL)`,
`CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at)`,
`CREATE TABLE IF NOT EXISTS daily_summaries (day TEXT PRIMARY KEY, sales_count INTEGER NOT NULL DEFAULT 0, gross INTEGER NOT NULL DEFAULT 0, discounts INTEGER NOT NULL DEFAULT 0, revenue INTEGER NOT NULL DEFAULT 0, cost INTEGER NOT NULL DEFAULT 0)`,
`CREATE TABLE IF NOT EXISTS invoice_counter (key TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0)`,
`INSERT OR IGNORE INTO invoice_counter (key,value) VALUES ('sales',0)`,
`CREATE TABLE IF NOT EXISTS archive_exports (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), start_at TEXT NOT NULL, end_at TEXT NOT NULL, sales_count INTEGER NOT NULL, created_at TEXT NOT NULL, used_at TEXT)`,
`CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, user_id TEXT, action TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
`INSERT OR IGNORE INTO settings (key,value) VALUES ('shop_name','FORGE Hardware')`,
`INSERT OR IGNORE INTO settings (key,value) VALUES ('shop_phone','')`,
`INSERT OR IGNORE INTO settings (key,value) VALUES ('shop_address','')`,
`INSERT OR IGNORE INTO settings (key,value) VALUES ('receipt_footer','Thank you for shopping with us!')`
];
(async()=>{for(const sql of statements) await client.execute(sql); console.log(`Database ready (${statements.length} statements).`); client.close();})().catch(e=>{console.error(e);process.exit(1)});
