import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
});

function localDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.BUSINESS_TIMEZONE || "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

(async () => {
  const salesCount = await db.execute("SELECT COUNT(*) AS count FROM sales");
  if (Number(salesCount.rows[0].count) > 0) {
    console.log("Sales data already exists. Skipping sample sales generation.");
    db.close();
    return;
  }

  const userRes = await db.execute("SELECT id, display_name FROM users LIMIT 1");
  if (userRes.rows.length === 0) {
    console.log("No user found. Run npm run owner:setup first.");
    db.close();
    return;
  }
  const user = userRes.rows[0] as unknown as { id: string; display_name: string };

  const shopRes = await db.execute("SELECT key, value FROM settings");
  const shopMap = Object.fromEntries(shopRes.rows.map((x) => [x.key as string, x.value as string]));
  const shop = {
    shop_name: shopMap.shop_name || "Handyman Hardware",
    shop_phone: shopMap.shop_phone || "",
    shop_address: shopMap.shop_address || "",
    receipt_footer: shopMap.receipt_footer || "Thank you for shopping with us!",
  };

  const prodsRes = await db.execute("SELECT * FROM products LIMIT 6");
  const prods = prodsRes.rows as unknown as {
    id: string;
    code: string;
    name: string;
    unit: string;
    price: number;
    buy_price: number;
    stock_milli: number;
  }[];

  if (prods.length === 0) {
    console.log("No products found to create sample sales.");
    db.close();
    return;
  }

  const now = Date.now();
  const sampleDays = [
    { offsetDays: 2, items: [prods[0], prods[1]], pay: "cash" },
    { offsetDays: 1, items: [prods[2], prods[3]], pay: "card" },
    { offsetDays: 0, items: [prods[0], prods[4] || prods[0]], pay: "cash" },
  ];

  for (let i = 0; i < sampleDays.length; i++) {
    const s = sampleDays[i];
    const saleDate = new Date(now - s.offsetDays * 86400000 - 3600000 * (i + 2));
    const isoDate = saleDate.toISOString();
    const day = localDay(saleDate);

    const counter = await db.execute(
      "UPDATE invoice_counter SET value = value + 1 WHERE key = 'sales' RETURNING value"
    );
    const invoiceNo = `HW-${String(counter.rows[0].value).padStart(7, "0")}`;
    const saleId = randomUUID();

    let subtotal = 0;
    let cost = 0;
    const saleItemsList = [];

    for (const p of s.items) {
      const qtyMilli = 2000;
      const lineTotal = Math.round((p.price * qtyMilli) / 1000);
      const lineCost = Math.round((p.buy_price * qtyMilli) / 1000);
      subtotal += lineTotal;
      cost += lineCost;

      saleItemsList.push({
        code: p.code,
        name: p.name,
        unit: p.unit,
        qtyMilli,
        unitPrice: p.price,
        lineTotal,
      });
    }

    const discount = 0;
    const total = subtotal;
    const tendered = total;
    const changeDue = 0;

    const receipt = {
      invoiceNo,
      createdAt: isoDate,
      cashier: user.display_name,
      shop,
      items: saleItemsList,
      subtotal,
      discount,
      total,
      tendered,
      changeDue,
      paymentMethod: s.pay,
    };

    // 1. Insert into sales FIRST
    await db.execute({
      sql: "INSERT INTO sales(id, invoice_no, cashier_id, subtotal, discount, total, cost, tendered, change_due, payment_method, receipt_json, created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      args: [
        saleId,
        invoiceNo,
        user.id,
        subtotal,
        discount,
        total,
        cost,
        tendered,
        changeDue,
        s.pay,
        JSON.stringify(receipt),
        isoDate,
      ],
    });

    // 2. Insert into sale_items and stock_movements
    for (const p of s.items) {
      const qtyMilli = 2000;
      const lineTotal = Math.round((p.price * qtyMilli) / 1000);

      await db.execute({
        sql: "INSERT INTO sale_items(id, sale_id, product_id, code, name, unit, qty_milli, unit_price, line_total) VALUES(?,?,?,?,?,?,?,?,?)",
        args: [
          randomUUID(),
          saleId,
          p.id,
          p.code,
          p.name,
          p.unit,
          qtyMilli,
          p.price,
          lineTotal,
        ],
      });

      await db.execute({
        sql: "INSERT INTO stock_movements(id, product_id, type, qty_diff_milli, note, user_id, sale_id, created_at) VALUES(?,?,?,?,?,?,?,?)",
        args: [
          randomUUID(),
          p.id,
          "sale",
          -qtyMilli,
          `Invoice ${invoiceNo}`,
          user.id,
          saleId,
          isoDate,
        ],
      });

      await db.execute({
        sql: "UPDATE products SET stock_milli = MAX(0, stock_milli - ?) WHERE id = ?",
        args: [qtyMilli, p.id],
      });
    }

    // 3. Update daily summary
    await db.execute({
      sql: "INSERT INTO daily_summaries(day, sales_count, gross, discounts, revenue, cost) VALUES(?,1,?,?,?,?) ON CONFLICT(day) DO UPDATE SET sales_count=sales_count+1, gross=gross+excluded.gross, discounts=discounts+excluded.discounts, revenue=revenue+excluded.revenue, cost=cost+excluded.cost",
      args: [day, subtotal, discount, total, cost],
    });
  }

  console.log(`✓ Added ${sampleDays.length} sample sales transactions.`);
  db.close();
})().catch((e) => {
  console.error("Failed to seed sales:", e);
  process.exit(1);
});
