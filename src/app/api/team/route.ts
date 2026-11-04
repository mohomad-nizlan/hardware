import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { authorize,denied,fail,guardOrigin,handleError,ok } from "@/lib/http";
import {client,newId,now,rows} from "@/lib/db";
import {audit} from "@/lib/auth";
export async function GET(){
 const u=await authorize("owner");if(denied(u))return u;
 try {return ok({users:rows(await client.execute("SELECT id,username,display_name,role,active,created_at FROM users ORDER BY created_at"))})}catch(e){return handleError(e)}
}
export async function POST(req:NextRequest){
 const u=await authorize("owner");if(denied(u))return u;if(!guardOrigin(req))return fail("Invalid origin",403);
 try{
  const b=await req.json();const username=String(b.username||"").trim().toLowerCase(),name=String(b.name||"").trim(),password=String(b.password||"");
  if(!/^[a-z0-9._-]{3,32}$/.test(username)||name.length<2||name.length>80||password.length<12||password.length>128||!["cashier","manager"].includes(b.role))return fail("Enter a valid username, name, role and password (12+ characters).");
  const id=newId();await client.execute({sql:"INSERT INTO users(id,username,display_name,password_hash,role,active,created_at) VALUES(?,?,?,?,?,1,?)",args:[id,username,name,await bcrypt.hash(password,12),b.role,now()]});
  await audit(u.id,"team.create",`Created ${b.role} ${username}`);return ok({id},201);
 }catch(e){return String(e).includes("UNIQUE")?fail("Username is already taken.",409):handleError(e)}
}
