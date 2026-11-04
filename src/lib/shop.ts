import { client,rows } from "@/lib/db";
export type Shop = {shop_name:string;shop_phone:string;shop_address:string;receipt_footer:string};
export async function getShop():Promise<Shop>{
 const r=await client.execute("SELECT key,value FROM settings");
 const kv=Object.fromEntries(rows<{key:string;value:string}>(r).map(x=>[x.key,x.value]));
 return {shop_name:kv.shop_name||"Handyman Hardware",shop_phone:kv.shop_phone||"",shop_address:kv.shop_address||"",receipt_footer:kv.receipt_footer||"Thank you for shopping with us!"};
}
