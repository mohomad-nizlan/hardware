import { NextRequest } from "next/server";
import { authorize,denied,fail,guardOrigin,handleError,ok } from "@/lib/http";
import {client,newId,now,rows} from "@/lib/db";
import {audit} from "@/lib/auth";

export async function POST(req:NextRequest){
 const user=await authorize("owner");if(denied(user))return user;if(!guardOrigin(req))return fail("Invalid origin",403);
 try{
  const body=await req.json();
  if(body.confirm!=="DELETE"||typeof body.exportId!=="string")return fail("Type DELETE to confirm and download an archive first.");
  const cutoff=new Date(Date.now()-90*86400000).toISOString();
  const tx=await client.transaction("write");
  let count=0;
  try{
   const exp=rows<{id:string;start_at:string;end_at:string;sales_count:number;used_at:string|null}>(await tx.execute({sql:"SELECT * FROM archive_exports WHERE id=? AND user_id=?",args:[body.exportId,user.id]}))[0];
   if(!exp||exp.used_at)throw new Error("Archive export is invalid or already used.");
   if(exp.end_at>cutoff)throw new Error("For safety, only records older than 90 days can be deleted. Select an older end date.");
   const current=await tx.execute({sql:"SELECT COUNT(*) AS count FROM sales WHERE created_at>=? AND created_at<?",args:[exp.start_at,exp.end_at]});
   count=Number(current.rows[0].count);
   if(count!==exp.sales_count)throw new Error("Records changed since export. Download a fresh archive before deleting.");
   if(count===0)throw new Error("No sales found for this archive period.");
   await tx.execute({sql:"DELETE FROM stock_movements WHERE sale_id IN (SELECT id FROM sales WHERE created_at>=? AND created_at<?)",args:[exp.start_at,exp.end_at]});
   await tx.execute({sql:"DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE created_at>=? AND created_at<?)",args:[exp.start_at,exp.end_at]});
   await tx.execute({sql:"DELETE FROM sales WHERE created_at>=? AND created_at<?",args:[exp.start_at,exp.end_at]});
   await tx.execute({sql:"UPDATE archive_exports SET used_at=? WHERE id=?",args:[now(),exp.id]});
   await tx.execute({sql:"INSERT INTO audit_log(id,user_id,action,detail,created_at) VALUES(?,?,?,?,?)",args:[newId(),user.id,"archive.purge",`Purged ${count} archived invoices. Export ${exp.id}. Daily summaries and current inventory retained.`,now()]});
   await tx.commit();
  }catch(e){try{await tx.rollback()}catch{};throw e}
  return ok({deleted:count,message:"Old invoice records deleted; current stock and daily sales summaries were preserved."});
 }catch(e){return e instanceof Error && (e.message.includes("archive")||e.message.includes("Archive")||e.message.includes("older")||e.message.includes("Records")||e.message.includes("No sales"))?fail(e.message,400):handleError(e)}
}
