import {NextRequest} from "next/server";
import bcrypt from "bcryptjs";
import {authorize,denied,fail,guardOrigin,ok,handleError} from "@/lib/http";
import {client,rows} from "@/lib/db";
import {audit,endSession} from "@/lib/auth";
export async function POST(req:NextRequest){
 const user=await authorize();if(denied(user))return user;if(!guardOrigin(req))return fail("Invalid origin",403);
 try{
  const body=await req.json(),old=String(body.current||""),next=String(body.next||"");
  if(next.length<12||next.length>128)return fail("New password must be 12-128 characters.");
  const record=rows<{password_hash:string}>(await client.execute({sql:"SELECT password_hash FROM users WHERE id=?",args:[user.id]}))[0];
  if(!record||!await bcrypt.compare(old,record.password_hash))return fail("Current password is incorrect.",403);
  await client.execute({sql:"UPDATE users SET password_hash=? WHERE id=?",args:[await bcrypt.hash(next,12),user.id]});
  await client.execute({sql:"DELETE FROM sessions WHERE user_id=?",args:[user.id]});
  await audit(user.id,"auth.password","User changed their password");await endSession();return ok({success:true});
 }catch(e){return handleError(e)}
}
