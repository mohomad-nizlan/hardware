import { authorize,denied,ok } from "@/lib/http";
export async function GET(){const u=await authorize();return denied(u)?u:ok({user:u})}
