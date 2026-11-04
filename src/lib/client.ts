export async function api<T=any>(url:string,opts?:RequestInit):Promise<T>{
 const res=await fetch(url,{...opts,cache:"no-store",headers:{...(opts?.body?{"Content-Type":"application/json"}:{}),...opts?.headers}});
 const data=await res.json().catch(()=>({error:"Unexpected server response."}));
 if(!res.ok)throw new Error(data.error||`Request failed (${res.status})`);
 return data;
}
export function jsonBody(data:unknown,method="POST"):RequestInit{return {method,body:JSON.stringify(data)}}
export async function saveResponse(res:Response,filename:string){
 if(!res.ok){const d=await res.json().catch(()=>({error:"Download failed."}));throw new Error(d.error||"Download failed.")}
 const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 return res.headers.get("x-export-id");
}
export function periodDates(p:string){
 const d=new Date(),end=new Date(d.getFullYear(),d.getMonth(),d.getDate());let start=new Date(end);
 if(p==="today"){}else if(p==="week")start.setDate(start.getDate()-6);else if(p==="month")start=new Date(end.getFullYear(),end.getMonth(),1);else if(p==="year")start=new Date(end.getFullYear(),0,1);
 const local=(v:Date)=>`${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,"0")}-${String(v.getDate()).padStart(2,"0")}`;
 return {start:local(start),end:local(end)};
}
export const shortDate=(v:string)=>new Intl.DateTimeFormat("en-LK",{day:"2-digit",month:"short",year:"numeric",timeZone:"Asia/Colombo"}).format(new Date(v));
