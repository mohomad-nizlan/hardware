import { NextRequest } from "next/server";
import { authorize,denied,fail,guardOrigin,handleError,ok } from "@/lib/http";
import {client,newId,now,rows} from "@/lib/db";
import {bounds,localDay,toCents,toMilli} from "@/lib/format";
import {getShop} from "@/lib/shop";
import {audit} from "@/lib/auth";

export async function GET(req:NextRequest){
 const user=await authorize();if(denied(user))return user;
 try{
  const query=req.nextUrl.searchParams;
  const start=query.get("start")||new Date(Date.now()-30*86400000).toISOString().slice(0,10);
  const end=query.get("end")||new Date().toISOString().slice(0,10);
  const {from,until}=bounds(start,end);
  const search=(query.get("q")||"").trim().slice(0,80);
  const dateCondition=search?"s.invoice_no LIKE ?":"s.created_at>=? AND s.created_at<?";
  const params=search?[`%${search}%`]:[from,until];
  const r=await client.execute({sql:`SELECT s.id,s.invoice_no,s.created_at,s.total,s.discount,s.payment_method,u.display_name AS cashier FROM sales s LEFT JOIN users u ON s.cashier_id=u.id WHERE ${dateCondition} ORDER BY s.created_at DESC LIMIT 500`,args:params});
  return ok({sales:rows(r)});
 }catch(e){return fail(e instanceof Error?e.message:"Invalid date range")}
}
export async function POST(req:NextRequest){
 const user=await authorize();if(denied(user))return user;if(!guardOrigin(req))return fail("Invalid origin",403);
 try{
  const b=await req.json();
  if(!Array.isArray(b.items)||b.items.length<1||b.items.length>100)return fail("Add between 1 and 100 distinct items.");
  if(!["cash","card","bank"].includes(b.paymentMethod))return fail("Invalid payment method.");
  const items: { productId: string; qtyMilli: number }[] = b.items.map((it: unknown) => {
    const x = it as { productId: unknown; quantity: unknown };
    if (typeof x.productId !== "string" || x.productId.length > 100) throw new Error("Invalid product.");
    const qtyMilli = toMilli(x.quantity);
    if (qtyMilli <= 0) throw new Error("Quantity must be greater than zero.");
    return { productId: x.productId, qtyMilli };
  });
  if (new Set(items.map((x) => x.productId)).size !== items.length) return fail("Duplicate items must be combined before checkout.");
  const shop=await getShop(); const tx=await client.transaction("write");
  let saleId="",invoiceNo="";
  try{
   const details: {productId:string;code:string;name:string;unit:string;qtyMilli:number;unitPrice:number;lineTotal:number;cost:number}[]=[];
   let subtotal=0,cost=0;
   for(const item of items){
    const p=rows<{id:string;code:string;name:string;unit:string;price:number;buy_price:number;stock_milli:number;active:number}>(await tx.execute({sql:"SELECT * FROM products WHERE id=?",args:[item.productId]}))[0];
    if(!p||!p.active)throw new Error("One of the products is unavailable. Refresh the cart.");
    if(p.stock_milli<item.qtyMilli)throw new Error(`Insufficient stock for ${p.name}. Available: ${p.stock_milli/1000} ${p.unit}.`);
    const lineTotal=Math.round(p.price*item.qtyMilli/1000);const lineCost=Math.round(p.buy_price*item.qtyMilli/1000);
    if(!Number.isSafeInteger(lineTotal)||!Number.isSafeInteger(lineCost))throw new Error("Sale amount exceeds supported range.");
    subtotal+=lineTotal;cost+=lineCost;
    details.push({productId:p.id,code:p.code,name:p.name,unit:p.unit,qtyMilli:item.qtyMilli,unitPrice:p.price,lineTotal,cost:lineCost});
   }
   const discount=toCents(b.discount||0);
   if(discount>subtotal)throw new Error("Discount cannot exceed the subtotal.");
   const total=subtotal-discount;
   const tendered=b.paymentMethod==="cash"?toCents(b.tendered):total;
   if(tendered<total)throw new Error("Cash received is less than the bill total.");
   if(!Number.isSafeInteger(total)||total>1e12)throw new Error("Sale total exceeds supported range.");
   const changeDue=tendered-total,time=now(),day=localDay(new Date(time));
   const counter=await tx.execute("UPDATE invoice_counter SET value=value+1 WHERE key='sales' RETURNING value");
   invoiceNo=`HW-${String(counter.rows[0].value).padStart(7,"0")}`;saleId=newId();
   const receipt={invoiceNo,createdAt:time,cashier:user.display_name,shop,items:details.map(({code,name,unit,qtyMilli,unitPrice,lineTotal})=>({code,name,unit,qtyMilli,unitPrice,lineTotal})),subtotal,discount,total,tendered,changeDue,paymentMethod:b.paymentMethod};
   await tx.execute({sql:"INSERT INTO sales(id,invoice_no,cashier_id,subtotal,discount,total,cost,tendered,change_due,payment_method,receipt_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",args:[saleId,invoiceNo,user.id,subtotal,discount,total,cost,tendered,changeDue,b.paymentMethod,JSON.stringify(receipt),time]});
   for(const d of details){
    const updated=await tx.execute({sql:"UPDATE products SET stock_milli=stock_milli-?,updated_at=? WHERE id=? AND stock_milli>=?",args:[d.qtyMilli,time,d.productId,d.qtyMilli]});
    if(!updated.rowsAffected)throw new Error(`Stock changed for ${d.name}; please retry.`);
    await tx.execute({sql:"INSERT INTO sale_items(id,sale_id,product_id,code,name,unit,qty_milli,unit_price,line_total) VALUES(?,?,?,?,?,?,?,?,?)",args:[newId(),saleId,d.productId,d.code,d.name,d.unit,d.qtyMilli,d.unitPrice,d.lineTotal]});
    await tx.execute({sql:"INSERT INTO stock_movements(id,product_id,type,qty_diff_milli,note,user_id,sale_id,created_at) VALUES(?,?,?,?,?,?,?,?)",args:[newId(),d.productId,"sale",-d.qtyMilli,invoiceNo,user.id,saleId,time]});
   }
   await tx.execute({sql:"INSERT INTO daily_summaries(day,sales_count,gross,discounts,revenue,cost) VALUES(?,1,?,?,?,?) ON CONFLICT(day) DO UPDATE SET sales_count=sales_count+1,gross=gross+excluded.gross,discounts=discounts+excluded.discounts,revenue=revenue+excluded.revenue,cost=cost+excluded.cost",args:[day,subtotal,discount,total,cost]});
   await tx.commit();
  }catch(e){try{await tx.rollback()}catch{};throw e}
  await audit(user.id,"sale.create",`Created invoice ${invoiceNo}`).catch(console.error);
  return ok({id:saleId,invoiceNo},201);
 }catch(e){return e instanceof Error && (e.message.includes("stock")||e.message.includes("Stock")||e.message.includes("Discount")||e.message.includes("Quantity")||e.message.includes("Cash")||e.message.includes("exceed")||e.message.includes("product")||e.message.includes("amount"))?fail(e.message,409):handleError(e)}
}
