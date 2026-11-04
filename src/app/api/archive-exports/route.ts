import {authorize,denied,handleError,ok} from "@/lib/http";
import {client,rows} from "@/lib/db";
export async function GET(){
 const user=await authorize("owner");if(denied(user))return user;
 try{const r=await client.execute({sql:"SELECT id,start_at,end_at,sales_count,created_at,used_at FROM archive_exports WHERE user_id=? ORDER BY created_at DESC LIMIT 30",args:[user.id]});return ok({exports:rows(r)})}catch(e){return handleError(e)}
}
