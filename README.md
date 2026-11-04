# FORGE Hardware POS

A practical, private, **Next.js 16** point-of-sale and inventory system for a single hardware store. Designed for desktop, laptop, tablet and mobile. No product images are stored.

**Built with:** Next.js App Router, React, TypeScript, Turso/libSQL, Drizzle schema, bcrypt password hashing, HTTP-only revocable database sessions, Lucide icons and custom responsive CSS. Uses parameterized SQL for database operations and explicit write transactions for checkout.

## Capabilities

- **Owner/staff access:** one initial owner; owner creates cashiers/managers, disables accounts, revokes sessions and resets staff passwords. No customer registration.
- **POS checkout:** keyboard barcode/code entry or product search, fractional quantities (e.g. metres or kilograms), discounts, cash/card/bank payment methods, tendered cash and change. Cash/card/bank are manual payment recordings; no integrated card processor.
- **Inventory:** unique codes, categories, units, purchase/selling prices, restocks, adjustments, low-stock warnings, active/inactive flag, transaction-linked stock movements.
- **Invoices:** unique sequential numbers, original product/price snapshot, both **80mm thermal** and **A4** web print layouts, unlimited reprints *while invoice records are retained*.
- **Dashboard / reports:** daily sales, revenue, estimated gross profit, current stock value, low-stock alerts, daily/weekly/monthly/yearly/custom reports, top products, Excel-compatible CSV exports (human-readable prices and quantities).
- **Data export & controlled purge:** ZIP backup containing JSON + CSV for sales, line items, stock movements, *current* inventory and daily summaries. Once backup is verified, the owner can permanently purge eligible sales (90+ days old). **Purging destroys in-app reprint access for those invoices.** Active products, present stock quantities, and daily summary totals are never purged.
- **Privacy:** no product image upload, no public signup, per-request access checks, server-side price/stock calculation.

## Run locally

Prerequisites: **Node.js 22+**, npm 10+, and a current web browser. A local SQLite-compatible DB is available for development, so you can run the project before opening a Turso account.

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` and provide a unique strong `OWNER_PASSWORD` of **at least 12 characters**. Leave `TURSO_DATABASE_URL=file:local.db` for development.

```bash
npm run db:setup
npm run owner:setup
```

Remove `OWNER_PASSWORD` from `.env.local` after the initial owner has been created. It is only used for first-time CLI provisioning and should **never** be deployed or committed.

```bash
npm run dev
```

Optional: populate your **local-only** database with 18 sample hardware items to try the interface immediately:

```bash
npm run demo:seed
```

The demo seed is blocked for remote/cloud databases. It will not insert anything if products already exist. Use it only for evaluation, not on real shop data.

Open **http://localhost:3000**, then sign in with `OWNER_USERNAME` and the initial password you created. Configure the shop name, phone, address and receipt message in Shop Settings.

### Optional: real Turso cloud database

1. Create a free Turso account at https://turso.tech/ and create a database.
2. Obtain a database URL and authentication token from the Turso dashboard/CLI.
3. Update `.env.local` (or your deployment provider secrets):

```env
TURSO_DATABASE_URL=libsql://your-database-your-org.turso.io
TURSO_AUTH_TOKEN=your-real-secret-token
NEXT_PUBLIC_SHOP_CURRENCY=LKR
NEXT_PUBLIC_SHOP_LOCALE=en-LK
BUSINESS_TIMEZONE=Asia/Colombo
BUSINESS_UTC_OFFSET=+05:30
```

4. Run `npm run db:setup` and `npm run owner:setup` against this *new empty* database, then remove the owner password secret. **Do not commit `.env.local`.**
5. Deploy to an environment supporting Next.js Node.js route handlers and server-side database connections. Set identical non-secret locale settings and private Turso credentials there. All money is stored as integer cents for safe accounting calculations.

**Important:** Current free allowances can change; check https://turso.tech/pricing before committing a business to a plan. Free cloud database, free hosting and local SQLite are different parts of deployment. Do not rely on free-tier services as a substitute for tested off-site backups, a recovery plan, monitoring and maintenance.

## Recommended setup for a hardware store

- **Hardware:** Desktop with USB barcode scanner configured for keyboard input and 80mm receipt printer (or a regular A4 printer). Enter/scan the item code and press Enter. Press **F2** to focus POS search.
- **Browsers:** Chrome/Edge for printer dialogs. Choose the right paper size, print margins and printer in the system/browser settings; browser printing does not automatically bypass the operating system print dialog.
- **Product codes:** Must be unique. Example: `PVC-ELB-20`, `NAIL-002`. A USB scanner that types into a focused input works without special plugins.
- **Quantity:** 3 decimal places (e.g. 1.25 metre); values stored as thousandths to avoid floating-point stock drift.
- **Price:** Per unit, entered in the selected currency.
- **Permissions:** Owner (all); Manager (inventory, checkout, reports, sales); Cashier (checkout, inventory view, print sales). Stock and price changes require Manager or Owner.

## Export and deletion policy

1. Open **Export & Archive**, select date range and click **Download complete ZIP backup**. Save the ZIP to more than one private location.
2. Open the ZIP, make sure the JSON/CSV contents are correct, and keep it secure. The application can tell it generated an archive, **not** that you stored it safely on your device.
3. Only the owner can select a generated archive for **Purge**. The entire archive end date must be at least **90 days in the past**, and the sales count must still match exactly.
4. Type `DELETE`, confirm offline backup verification, and purge. The action removes invoice headers, receipt snapshots, line items and sale-linked stock movement rows. **It does not change present stock** and preserves the daily historical financial totals used by reports.
5. Purged invoices cannot be found/reprinted in the app. Excel-style exports and summaries remain available for other dates and records. You need to check tax/document retention law before purging and retain the original ZIP for the legally required period.

*Note:* ZIP archive exports are generated in server memory. Very large ranges are rejected; export monthly batches (limit 25,000 sales / 100,000 sale lines / 150,000 stock movements / 100,000 products per ZIP). For enterprise-scale data volumes, add a streaming archival job and a tested restore process rather than relying on browser downloads.

## Security and production readiness

- Passwords use bcrypt with cost 12; server-side session cookies are `httpOnly`, `SameSite=Strict`, `Secure` in production, tied to a revocable database record. Lockout occurs after repeated failed login attempts by username.
- Database queries are parameterized. POS validates stock and updates it in a single write transaction before committing a sale. Invoice reprints do not mutate sales or stock.
- API access checks run on every endpoint. Mutating browser requests are same-origin checked. Ensure HTTPS in production and configure reverse proxy headers correctly.
- The owner must not share a login. Disable staff accounts when they leave. Use unique strong passwords.
- Basic stock/profit reports are **not** a full double-entry accounting or tax system. No unpaid debt tracking, customer account balances, integrated payment gateway, tax-compliant e-invoicing, refunds or multi-branch synchronization is included.
- Before high-volume real-world use, test physical printers, concurrency under checkout, local tax receipts, backups, staff training and procedures for voided/returned items. Implement refunds/voids with a separate controlled workflow if required.
- Development is preconfigured for **Asia/Colombo** and **LKR**; for another region configure timezone plus a correct business UTC offset (the date boundary implementation assumes a fixed offset and does not handle daylight saving time). **Default reports reflect the business timezone only if these settings match.**
- Validate migration changes before deploying; `scripts/migrate.ts` is a version-one idempotent initializer, not an automatic schema migration framework. `src/lib/schema.ts` stores the Drizzle schema for future typed migrations.
- Avoid deleting production data without a tested recovery process. Long-term accounting retention may legally exceed 90 days.

## Project map

```text
src/app/(app)/        Authenticated pages: dashboard, pos, products, sales, reports, archive, team, settings
src/app/api/          Authenticated route handlers (auth, inventory, sales, reports, archive, user management)
src/app/print/[id]/   A4 + 80mm printer-ready invoice
src/components/      Shared shell and UI controls
src/lib/             Turso/libSQL client, Drizzle schema, money/date utilities, auth, export helpers
scripts/migrate.ts   Initialize database (idempotent)
scripts/create-owner.ts  Provision exactly one initial owner
```

## Troubleshooting

- **Login not working?** Ensure `npm run db:setup`, then `npm run owner:setup` completed and the app is pointed at the same `TURSO_DATABASE_URL` as the scripts.
- **No products?** Sign in as Owner or Manager and create inventory items before checkout.
- **Printer blank / wrong width?** In the browser print dialog, select the printer, paper size and scaling (100%). Use thermal output for 80mm receipt printers and A4 output for standard printers.
- **No free space gained immediately?** Turso/SQLite storage accounting and compaction may not immediately reclaim physical file size. The purge deletes eligible rows but does not promise a precise number of megabytes or a smaller local database file.
- **Need historical invoice reprints?** Do not permanently purge those records. Keep the original records in the live database or restore from a validated external archive into a separate authorized recovery tool.

This is a **functional starter application**, not a claim of audited enterprise/POS certification. For a client using real money, perform staging tests, security review, backup/restore drills and printer validation before production launch.
