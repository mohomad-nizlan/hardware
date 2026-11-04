import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { beginSession, audit } from "@/lib/auth";
import { client, now, rows } from "@/lib/db";
import { fail, guardOrigin, handleError, ok } from "@/lib/http";

export async function POST(req:NextRequest){
 if(!guardOrigin(req))return fail("Invalid request origin.",403);
 try{
  const body=await req.json();
  const username=String(body.username||"").trim().toLowerCase();
  const password=String(body.password||"");
  if(!/^[a-z0-9._-]{3,32}$/.test(username)||password.length>256)return fail("Invalid credentials.",401);
  const attempt=rows<{failures:number;locked_until:string|null}>(await client.execute({sql:"SELECT failures,locked_until FROM login_attempts WHERE username=?",args:[username]}))[0];
  if(attempt?.locked_until && attempt.locked_until>now())return fail("Too many attempts. Try again in 15 minutes.",429);
  const u=rows<{id:string;password_hash:string;active:number}>(await client.execute({sql:"SELECT id,password_hash,active FROM users WHERE username=?",args:[username]}))[0];
  const verified=u && await bcrypt.compare(password,u.password_hash);
  if(!verified||!u.active){
   const failures=(attempt?.failures||0)+1;
   const locked=failures>=6?new Date(Date.now()+15*60*1000).toISOString():null;
   await client.execute({sql:"INSERT INTO login_attempts(username,failures,locked_until) VALUES(?,?,?) ON CONFLICT(username) DO UPDATE SET failures=excluded.failures,locked_until=excluded.locked_until",args:[username,failures,locked]});
   return fail("Invalid credentials.",401);
  }
  await client.execute({sql:"DELETE FROM login_attempts WHERE username=?",args:[username]});
  await beginSession(u.id); await audit(u.id,"auth.login","Successful sign in");
  return ok({success:true,role:rows<{role:string}>(await client.execute({sql:"SELECT role FROM users WHERE id=?",args:[u.id]}))[0].role});
 }catch(e){return handleError(e)}
}
