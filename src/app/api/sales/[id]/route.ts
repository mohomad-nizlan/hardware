import { authorize,denied,fail,handleError,ok } from "@/lib/http";
import {client,rows} from "@/lib/db";
export async function GET(_:Request,context:{params:Promise<{id:string}>}){
 const user=await authorize();if(denied(user))return user;
 try{
  const {id}=await context.params;
  const sale=rows<{id:string;invoice_no:string;receipt_json:string;created_at:string}>(await client.execute({sql:"SELECT id,invoice_no,receipt_json,created_at FROM sales WHERE id=?",args:[id]}))[0];
  if(!sale)return fail("Invoice not found. It may have been purged after archival.",404);
  return ok({sale:{id:sale.id,invoiceNo:sale.invoice_no,createdAt:sale.created_at,receipt:JSON.parse(sale.receipt_json)}});
 }catch(e){return handleError(e)}
}
