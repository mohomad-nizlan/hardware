import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { client, newId, now, rows } from "@/lib/db";

export type Role = "owner" | "manager" | "cashier";
export type AuthUser = {id:string;username:string;display_name:string;role:Role};
const COOKIE = "forge_pos_session";
const SEVEN_DAYS = 60*60*24*7;
const hash = (s:string) => createHash("sha256").update(s).digest("hex");

export async function getUser():Promise<AuthUser|null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const r = await client.execute({
    sql:"SELECT u.id,u.username,u.display_name,u.role FROM sessions s INNER JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>? AND u.active=1 LIMIT 1",
    args:[hash(token),now()]
  });
  return rows<AuthUser>(r)[0] || null;
}
export async function beginSession(userId:string){
  const token=randomBytes(32).toString("base64url");
  await client.execute({sql:"INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)",args:[hash(token),userId,new Date(Date.now()+SEVEN_DAYS*1000).toISOString()]});
  (await cookies()).set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:SEVEN_DAYS});
}
export async function endSession(){
  const jar=await cookies();
  const token=jar.get(COOKIE)?.value;
  if(token) await client.execute({sql:"DELETE FROM sessions WHERE id=?",args:[hash(token)]});
  jar.delete(COOKIE);
}
export function permitted(role:Role, need:"staff"|"manager"|"owner"){return need==="staff" || (need==="manager"&&role!=="cashier") || (need==="owner"&&role==="owner")}
export async function audit(userId:string|null,action:string,detail:string){await client.execute({sql:"INSERT INTO audit_log VALUES(?,?,?,?,?)",args:[newId(),userId,action,detail,now()]})}
