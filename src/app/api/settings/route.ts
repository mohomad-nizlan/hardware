import { NextRequest } from "next/server";
import { authorize,denied,fail,guardOrigin,handleError,ok } from "@/lib/http";
import {client} from "@/lib/db";
import {getShop} from "@/lib/shop";
import {audit} from "@/lib/auth";
export async function GET(){const u=await authorize();if(denied(u))return u;return ok({shop:await getShop()})}
export async function PATCH(req:NextRequest){
 const u=await authorize("owner");if(denied(u))return u;if(!guardOrigin(req))return fail("Invalid origin",403);
 try {
  const b=await req.json();
  for(const key of ["shop_name","shop_phone","shop_address","receipt_footer"]){
   if(typeof b[key]!=="string"||b[key].trim().length>(key==="shop_name"?80:250))return fail("Invalid shop settings.");
  }
  if(!b.shop_name.trim())return fail("Shop name is required.");
  for(const key of ["shop_name","shop_phone","shop_address","receipt_footer"]){
   await client.execute({sql:"INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",args:[key,b[key].trim()]});
  }
  await audit(u.id,"settings.update","Updated shop and receipt settings");return ok({success:true});
 }catch(e){return handleError(e)}
}
