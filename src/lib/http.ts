import { NextRequest, NextResponse } from "next/server";
import { getUser, permitted, type AuthUser } from "@/lib/auth";

export const ok = (data:unknown,status=200) => NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export const fail = (message:string,status=400) => ok({error:message},status);
export async function authorize(level:"staff"|"manager"|"owner"="staff"):Promise<AuthUser|NextResponse>{
  const user=await getUser();
  if(!user)return fail("Please sign in again.",401);
  if(!permitted(user.role,level))return fail("You do not have permission for this action.",403);
  return user;
}
export const denied=(u:unknown):u is NextResponse=>u instanceof NextResponse;
export function guardOrigin(req:NextRequest){
  const origin=req.headers.get("origin");
  if(!origin)return true; // Non-browser CLI requests still require a valid session cookie.
  try {
    const source=new URL(origin);
    const host=req.headers.get("x-forwarded-host") || req.headers.get("host");
    return source.host===host && ["http:","https:"].includes(source.protocol);
  } catch {return false;}
}
export function handleError(e:unknown){
  console.error("POS API error:",e);
  return fail("The request could not be completed. Please try again.",500);
}
