/** Schema definitions are kept in Drizzle for typed future migrations. */
import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["owner", "manager", "cashier"] }).notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(),
});
export const products = sqliteTable("products", {
  id: text("id").primaryKey(), code: text("code").notNull().unique(),
  name: text("name").notNull(), category: text("category").notNull().default("General"),
  unit: text("unit").notNull().default("pcs"),
  buyPrice: integer("buy_price").notNull(), price: integer("price").notNull(),
  stockMilli: integer("stock_milli").notNull().default(0),
  reorderMilli: integer("reorder_milli").notNull().default(5000),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, t => [index("idx_products_name").on(t.name)]);
export const sales = sqliteTable("sales", {
  id: text("id").primaryKey(), invoiceNo: text("invoice_no").notNull().unique(),
  cashierId: text("cashier_id").references(() => users.id),
  subtotal: integer("subtotal").notNull(), discount: integer("discount").notNull(),
  total: integer("total").notNull(), cost: integer("cost").notNull(),
  tendered: integer("tendered").notNull(), changeDue: integer("change_due").notNull(),
  paymentMethod: text("payment_method").notNull(), receiptJson: text("receipt_json").notNull(),
  createdAt: text("created_at").notNull(),
}, t => [index("idx_sales_created_at").on(t.createdAt)]);
export const saleItems = sqliteTable("sale_items", {
  id: text("id").primaryKey(), saleId: text("sale_id").notNull().references(() => sales.id),
  productId: text("product_id").references(() => products.id),
  code: text("code").notNull(), name: text("name").notNull(), unit: text("unit").notNull(),
  qtyMilli: integer("qty_milli").notNull(), unitPrice: integer("unit_price").notNull(),
  lineTotal: integer("line_total").notNull(),
});
export const stockMovements = sqliteTable("stock_movements", {
  id: text("id").primaryKey(), productId: text("product_id").notNull().references(() => products.id),
  type: text("type").notNull(), qtyDiffMilli: integer("qty_diff_milli").notNull(),
  note: text("note").notNull().default(""), userId: text("user_id").references(() => users.id),
  saleId: text("sale_id").references(() => sales.id), createdAt: text("created_at").notNull(),
}, t => [index("idx_stock_movements_date").on(t.createdAt)]);
export const dailySummaries = sqliteTable("daily_summaries", {
  day: text("day").primaryKey(), salesCount: integer("sales_count").notNull(),
  gross: integer("gross").notNull(), discounts: integer("discounts").notNull(),
  revenue: integer("revenue").notNull(), cost: integer("cost").notNull(),
});
export const archiveExports = sqliteTable("archive_exports", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id),
  startAt: text("start_at").notNull(), endAt: text("end_at").notNull(),
  salesCount: integer("sales_count").notNull(), createdAt: text("created_at").notNull(),
  usedAt: text("used_at"),
});
export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(), userId: text("user_id"), action: text("action").notNull(),
  detail: text("detail").notNull(), createdAt: text("created_at").notNull(),
});
export const settings = sqliteTable("settings", { key: text("key").primaryKey(), value: text("value").notNull() });
