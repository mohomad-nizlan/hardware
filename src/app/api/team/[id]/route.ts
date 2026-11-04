import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { authorize,denied,fail,guardOrigin,handleError,ok } from "@/lib/http";
import {client,rows} from "@/lib/db";
import {audit} from "@/lib/auth";
export async function PATCH(req:NextRequest,context:{params:Promise<{id:string}>}){
 const u=await authorize("owner");if(denied(u))return u;if(!guardOrigin(req))return fail("Invalid origin",403);
 try {
  const {id}=await context.params;if(id===u.id)return fail("Cannot edit the owner account here.",403);
  const account=rows<{role:string;username:string}>(await client.execute({sql:"SELECT role,username FROM users WHERE id=?",args:[id]}))[0];
  if(!account||account.role==="owner")return fail("Cannot change an owner account.",403);
  const b=await req.json();
  if(typeof b.active==="boolean"){
   await client.execute({sql:"UPDATE users SET active=? WHERE id=?",args:[b.active?1:0,id]});
   if(!b.active)await client.execute({sql:"DELETE FROM sessions WHERE user_id=?",args:[id]});
  }
  if(typeof b.password==="string"&&b.password.length){
   if(b.password.length<12||b.password.length>128)return fail("Password must be 12-128 characters.");
   await client.execute({sql:"UPDATE users SET password_hash=? WHERE id=?",args:[await bcrypt.hash(b.password,12),id]});
   await client.execute({sql:"DELETE FROM sessions WHERE user_id=?",args:[id]});
  }
  await audit(u.id,"team.update",`Updated staff user ${account.username}`);return ok({success:true});
 }catch(e){return handleError(e)}
}
