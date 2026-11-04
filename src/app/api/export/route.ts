import { NextRequest } from "next/server";
import JSZip from "jszip";
import { authorize,denied,fail,guardOrigin,handleError } from "@/lib/http";
import { client,newId,now } from "@/lib/db";
import { bounds } from "@/lib/format";
import { csv,csvDownload,exportData,readable } from "@/lib/exports";
import {audit} from "@/lib/auth";

export async function GET(req:NextRequest){
 const user=await authorize("manager");if(denied(user))return user;
 const q=req.nextUrl.searchParams;
 const type=q.get("type")||"sales",start=q.get("start")||"",end=q.get("end")||"";
 if(!["sales","inventory","movements","summary"].includes(type))return fail("Invalid export type.");
 try{
  const data=await exportData(type,start,end);
  const selected=readable(type,data);
  return csvDownload(csv(selected),`hardware-${type}-${start}-to-${end}.csv`);
 }catch(e){return fail(e instanceof Error?e.message:"Export failed",400)}
}
export async function POST(req:NextRequest){
 const user=await authorize("owner");if(denied(user))return user;if(!guardOrigin(req))return fail("Invalid origin",403);
 try{
  const b=await req.json();const start=String(b.start||""),end=String(b.end||"");
  const {from,until}=bounds(start,end);
  const data=await exportData("archive",start,end);
  const zip=new JSZip();
  zip.file("README.txt",`FORGE HARDWARE POS - ARCHIVE BACKUP\nDate range: ${start} to ${end}\nCreated: ${now()}\nSales: ${data.sales.length}\n\nContains JSON source records for offline recovery/reference and CSV files for analysis.\nThe inventory CSV is a CURRENT STOCK SNAPSHOT, not historical stock for the archived period.\nStore this file in a secure private location. Customer/accounting data may be sensitive.\nIMPORTANT: Purging afterwards permanently removes the original invoice records in this app.\n`);
  for(const [name,records] of Object.entries({sales:data.sales,sale_items:data.items,stock_movements:data.movements,inventory_snapshot:data.products,daily_summaries:data.daily})){
   zip.file(`${name}.json`,JSON.stringify(records,null,2));
   zip.file(`${name}.csv`,csv(readable(name==="inventory_snapshot"?"inventory":name==="daily_summaries"?"summary":name==="stock_movements"?"movements":name==="sale_items"?"sale_items":"sales",data)));
  }
  const dataBuffer=await zip.generateAsync({type:"uint8array",compression:"DEFLATE",compressionOptions:{level:5}});
  const id=newId();
  await client.execute({sql:"INSERT INTO archive_exports(id,user_id,start_at,end_at,sales_count,created_at) VALUES(?,?,?,?,?,?)",args:[id,user.id,from,until,data.sales.length,now()]});
  await audit(user.id,"archive.export",`Downloaded archive ${id}, ${start} through ${end}, ${data.sales.length} invoices`);
  return new Response(new Uint8Array(dataBuffer),{headers:{"Content-Type":"application/zip","Content-Disposition":`attachment; filename="hardware-archive-${start}-to-${end}.zip"`,"X-Export-Id":id,"Cache-Control":"no-store"}});
 }catch(e){return e instanceof Error && e.message.includes("range")?fail(e.message,400):handleError(e)}
}
