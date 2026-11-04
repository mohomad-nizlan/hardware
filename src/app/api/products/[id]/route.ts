import { NextRequest } from "next/server";
import { authorize,denied,fail,guardOrigin,handleError,ok } from "@/lib/http";
import {client,now} from "@/lib/db";
import {toCents,toMilli,validCode} from "@/lib/format";
import {audit} from "@/lib/auth";
export async function PATCH(req:NextRequest,context:{params:Promise<{id:string}>}){
 const user=await authorize("manager");if(denied(user))return user;if(!guardOrigin(req))return fail("Invalid origin",403);
 try{
  const {id}=await context.params;const b=await req.json();
  const code=String(b.code||"").trim().toUpperCase(),name=String(b.name||"").trim();
  const category=String(b.category||"General").trim(),unit=String(b.unit||"pcs").trim();
  if(!validCode(code)||name.length<2||name.length>150||category.length>60||unit.length>20)return fail("Invalid product details.");
  const price=toCents(b.price),buyPrice=toCents(b.buyPrice),reorder=toMilli(b.reorder||0);
  const result=await client.execute({sql:"UPDATE products SET code=?,name=?,category=?,unit=?,price=?,buy_price=?,reorder_milli=?,active=?,updated_at=? WHERE id=?",args:[code,name,category,unit,price,buyPrice,reorder,b.active?1:0,now(),id]});
  if(!result.rowsAffected)return fail("Product not found.",404);
  await audit(user.id,"product.edit",`Updated product ${code}`);return ok({success:true});
 }catch(e){if(String(e).includes("UNIQUE"))return fail("That product code already exists.",409);return handleError(e)}
}
