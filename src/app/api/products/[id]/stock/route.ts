import { NextRequest } from "next/server";
import { authorize,denied,fail,guardOrigin,handleError,ok } from "@/lib/http";
import {client,newId,now} from "@/lib/db";
import {toMilli} from "@/lib/format";
import {audit} from "@/lib/auth";
export async function POST(req:NextRequest,context:{params:Promise<{id:string}>}){
 const user=await authorize("manager");if(denied(user))return user;if(!guardOrigin(req))return fail("Invalid origin",403);
 const {id}=await context.params;
 try {
  const b=await req.json();const diff=toMilli(b.quantity,true),note=String(b.note||"Stock adjustment").trim().slice(0,200);
  if(diff===0)return fail("Enter a non-zero quantity.");
  const tx=await client.transaction("write");
  try{
   const updated=await tx.execute({sql:"UPDATE products SET stock_milli=stock_milli+?,updated_at=? WHERE id=? AND stock_milli+?>=0",args:[diff,now(),id,diff]});
   if(!updated.rowsAffected){await tx.rollback();return fail("Not enough stock to remove, or product not found.",409)}
   await tx.execute({sql:"INSERT INTO stock_movements(id,product_id,type,qty_diff_milli,note,user_id,sale_id,created_at) VALUES(?,?,?,?,?,?,NULL,?)",args:[newId(),id,diff>0?"restock":"adjustment",diff,note,user.id,now()]});
   await tx.commit();
  }catch(e){await tx.rollback();throw e}
  await audit(user.id,"stock.adjust",`Product ${id}, change ${diff/1000}: ${note}`);
  return ok({success:true});
 }catch(e){return handleError(e)}
}
