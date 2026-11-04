import { client,rows } from "@/lib/db";
import { bounds } from "@/lib/format";

function csvCell(value:unknown){
 if(typeof value==="number" && Number.isFinite(value))return String(value);
 const str=value===null||value===undefined?"":String(value);
 // Prevent spreadsheet formula injection in untrusted product names, notes etc.
 const safe=/^[=+@\-\t\r]/.test(str) ? `'${str}` : str;
 return `"${safe.replaceAll('"','""')}"`;
}
export function csv(records:Record<string,unknown>[],columns?:string[]){
 const names=columns || Object.keys(records[0]||{});
 return "\ufeff"+[names.join(","),...records.map(r=>names.map(key=>csvCell(r[key])).join(","))].join("\r\n");
}
export async function exportData(type:string,start:string,end:string){
 const {from,until}=bounds(start,end);
 const salesFilter={from,until};
 const [sales,items,movements,products,daily]=await Promise.all([
  client.execute({sql:"SELECT id,invoice_no,cashier_id,subtotal,discount,total,cost,tendered,change_due,payment_method,receipt_json,created_at FROM sales WHERE created_at>=? AND created_at<? ORDER BY created_at LIMIT 25001",args:[from,until]}),
  client.execute({sql:"SELECT si.* FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.created_at>=? AND s.created_at<? ORDER BY si.sale_id LIMIT 100001",args:[from,until]}),
  client.execute({sql:"SELECT * FROM stock_movements WHERE (created_at>=? AND created_at<?) OR sale_id IN (SELECT id FROM sales WHERE created_at>=? AND created_at<?) ORDER BY created_at LIMIT 150001",args:[from,until,from,until]}),
  client.execute("SELECT id,code,name,category,unit,buy_price,price,stock_milli,reorder_milli,active,created_at,updated_at FROM products ORDER BY code LIMIT 100001"),
  client.execute({sql:"SELECT * FROM daily_summaries WHERE day>=? AND day<=? ORDER BY day",args:[start,end]}),
 ]);
 if(sales.rows.length>25000||items.rows.length>100000||movements.rows.length>150000||products.rows.length>100000)throw new Error("This range is too large for a safe single export. Select a shorter period and export in batches.");
 return {sales:rows<Record<string,unknown>>(sales),items:rows<Record<string,unknown>>(items),movements:rows<Record<string,unknown>>(movements),products:rows<Record<string,unknown>>(products),daily:rows<Record<string,unknown>>(daily),salesFilter};
}
export function csvDownload(content:string,filename:string){
 return new Response(content,{headers:{
  "Content-Type":"text/csv; charset=utf-8",
  "Content-Disposition":`attachment; filename="${filename}"`,
  "Cache-Control":"no-store"
 }});
}

/** Human-readable CSV columns. The ZIP also contains unmodified JSON for exact backup. */
export function readable(type:string, data:{sales:Record<string,unknown>[];items:Record<string,unknown>[];movements:Record<string,unknown>[];products:Record<string,unknown>[];daily:Record<string,unknown>[]}):Record<string,unknown>[]{
 const n=(v:unknown)=>Number(v||0);
 if(type==="inventory")return data.products.map(p=>({
   product_code:p.code,name:p.name,category:p.category,unit:p.unit,
   purchase_price:n(p.buy_price)/100,selling_price:n(p.price)/100,
   available_quantity:n(p.stock_milli)/1000,reorder_level:n(p.reorder_milli)/1000,
   status:n(p.active)?"Active":"Inactive"
 }));
 if(type==="summary")return data.daily.map(d=>({date:d.day,sales_count:d.sales_count,
   gross:n(d.gross)/100,discounts:n(d.discounts)/100,revenue:n(d.revenue)/100,cost:n(d.cost)/100,
   estimated_gross_profit:(n(d.revenue)-n(d.cost))/100
 }));
 if(type==="movements")return data.movements.map(m=>({date:m.created_at,product_id:m.product_id,
   type:m.type,quantity_change:n(m.qty_diff_milli)/1000,note:m.note,sale_id:m.sale_id
 }));
 if(type==="sale_items")return data.items.map(i=>({sale_id:i.sale_id,product_code:i.code,product_name:i.name,
   unit:i.unit,quantity:n(i.qty_milli)/1000,unit_price:n(i.unit_price)/100,line_total:n(i.line_total)/100
 }));
 const byId=new Map(data.sales.map(s=>[s.id,s]));
 const itemBySale=new Map<string,number>();
 for(const i of data.items){const id=String(i.sale_id);itemBySale.set(id,(itemBySale.get(id)||0)+1)}
 return data.sales.map(s=>({invoice_number:s.invoice_no,date:s.created_at,payment_method:s.payment_method,
   subtotal:n(s.subtotal)/100,discount:n(s.discount)/100,total:n(s.total)/100,
   estimated_cost:n(s.cost)/100,item_lines:itemBySale.get(String(s.id))||0
 }));
}
