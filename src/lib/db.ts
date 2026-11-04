import "server-only";
import { createClient, type InStatement } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/lib/schema";

const defaultUrl = "libsql://hardware-prophetic-libra-tnygvo.aws-ap-south-1.turso.io";
const defaultToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTM3NjAxNzAsImlkIjoiMDFhMWE0NmYtNGYwMS03MzllLTliNmQtNDM3OWU5YmFkMjRmIiwia2lkIjoiaU11NVgxcWJobWxxR0lGZC1KMG14QlM3bkhwdk5qSi0wN09Vd01GVkpMSSIsInJpZCI6IjE3NGU1ZTVlLTcxZGQtNDQ4OC04Y2M0LTI1YjJiMTUyMTUzYiJ9.7mezQShZ6mwrOS9NGc5XXOPmHT3AT0JDS0mckrstIPY9XmOxpEBe0oZRk3qRMPgoLLkpSHCVvffAPTfe4kBQCw";

const url = process.env.TURSO_DATABASE_URL || defaultUrl;
const authToken = process.env.TURSO_AUTH_TOKEN || defaultToken;

const rawClient = createClient({ url, authToken });
export const db = drizzle(rawClient, { schema });

export const now = () => new Date().toISOString();
export const newId = () => crypto.randomUUID();
export const rows = <T = Record<string, unknown>>(result: { rows: readonly unknown[] }): T[] =>
  Array.from(result.rows) as T[];

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
  `INSERT OR IGNORE INTO settings (key,value) VALUES ('shop_name','Handyman Hardware')`,
  `INSERT OR IGNORE INTO settings (key,value) VALUES ('shop_phone','')`,
  `INSERT OR IGNORE INTO settings (key,value) VALUES ('shop_address','')`,
  `INSERT OR IGNORE INTO settings (key,value) VALUES ('receipt_footer','Thank you for shopping with us!')`
];

const sampleProducts: [string, string, string, string, number, number, number, number][] = [
  ["HAM-016", "Claw Hammer 16 oz", "Hand Tools", "pcs", 1850, 2900, 24, 5],
  ["SCR-SET-10", "Screwdriver Set 10 pcs", "Hand Tools", "set", 2700, 4200, 12, 3],
  ["PVC-ELB-20", "PVC Elbow 20 mm", "Plumbing", "pcs", 85, 145, 145, 20],
  ["PVC-PIPE-20", "PVC Pipe 20 mm", "Plumbing", "metre", 195, 340, 100.5, 15],
  ["TAPE-PTFE", "PTFE Thread Seal Tape", "Plumbing", "roll", 75, 150, 96, 15],
  ["NAILS-2IN", "Steel Nails 2 inch", "Fasteners", "kg", 320, 525, 75.25, 10],
  ["SCREW-25", "Wood Screws 25 mm", "Fasteners", "box", 300, 520, 70, 10],
  ["SWITCH-1G", "One Gang Wall Switch", "Electrical", "pcs", 280, 470, 36, 6],
  ["SOCKET-13A", "13A Universal Socket", "Electrical", "pcs", 450, 720, 38, 7],
  ["WIRE-15-B", "Electrical Cable 1.5 mm Black", "Electrical", "metre", 130, 205, 340.75, 40],
  ["LED-BULB-9W", "LED Bulb 9W Warm White", "Electrical", "pcs", 350, 590, 52, 10],
  ["CEMENT-50", "Cement Bag 50 kg", "Building Materials", "bag", 1880, 2280, 34, 10],
  ["SAND-25", "Washed Sand 25 kg", "Building Materials", "bag", 360, 550, 55, 12],
  ["GLUE-PVC-100", "PVC Solvent Cement 100 ml", "Adhesives", "pcs", 235, 410, 22, 6],
  ["PAINT-BRUSH-2", "Paint Brush 2 inch", "Painting", "pcs", 190, 320, 45, 10],
  ["MASK-TAPE-1", "Masking Tape 1 inch", "Painting", "roll", 170, 280, 38, 10],
  ["DRILL-BIT-6", "Masonry Drill Bit 6 mm", "Power Tools", "pcs", 250, 410, 26, 5],
  ["CUT-DISC-4", "Metal Cutting Disc 4 inch", "Power Tools", "pcs", 140, 235, 60, 10],
];

let initPromise: Promise<void> | null = null;
export async function ensureDbReady(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      for (const sql of statements) {
        await rawClient.execute(sql);
      }
      const existing = await rawClient.execute("SELECT COUNT(*) AS total FROM users");
      if (Number(existing.rows[0].total) === 0) {
        const id = crypto.randomUUID();
        const nowStr = new Date().toISOString();
        // admin123 hashed with 12 bcrypt rounds
        await rawClient.execute({
          sql: "INSERT INTO users(id,username,display_name,password_hash,role,active,created_at) VALUES(?,?,?,?,?,?,?)",
          args: [
            id,
            "owner",
            "Handyman Hardware",
            "$2b$12$tp6n3bJwlz6Eor00Xfs7wOALrfeSgGyV60bcKxUJVHOdMPkcKEvFa",
            "owner",
            1,
            nowStr,
          ],
        });
      }

      const prodCount = await rawClient.execute("SELECT COUNT(*) AS total FROM products");
      if (Number(prodCount.rows[0].total) === 0) {
        const nowStr = new Date().toISOString();
        for (const [code, name, category, unit, cost, price, stock, reorder] of sampleProducts) {
          await rawClient.execute({
            sql: "INSERT INTO products(id,code,name,category,unit,buy_price,price,stock_milli,reorder_milli,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,1,?,?)",
            args: [
              crypto.randomUUID(),
              code,
              name,
              category,
              unit,
              Math.round(cost * 100),
              Math.round(price * 100),
              Math.round(stock * 1000),
              Math.round(reorder * 1000),
              nowStr,
              nowStr,
            ],
          });
        }
      }
    } catch (e) {
      console.error("Database ready check:", e);
    }
  })();
  return initPromise;
}

export const client = {
  async execute(stmt: InStatement) {
    await ensureDbReady();
    return rawClient.execute(stmt);
  },
  async batch(stmts: InStatement[], mode?: "write" | "read" | "deferred") {
    await ensureDbReady();
    return rawClient.batch(stmts, mode);
  },
  async transaction(mode?: "write" | "read" | "deferred") {
    await ensureDbReady();
    return rawClient.transaction(mode);
  },
  close() {
    return rawClient.close();
  },
};
