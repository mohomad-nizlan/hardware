export const currency = process.env.NEXT_PUBLIC_SHOP_CURRENCY || "LKR";
export const locale = process.env.NEXT_PUBLIC_SHOP_LOCALE || "en-LK";
export function money(cents:number){return new Intl.NumberFormat(locale,{style:"currency",currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100)}
export const moneyInput=(cents:number)=> (cents/100).toFixed(2);
export function toCents(value:unknown):number {
  const n=Number(value);
  if(!Number.isFinite(n)||n<0||n>1e10)throw new Error("Enter a valid non-negative amount.");
  return Math.round(n*100);
}
export function toMilli(value:unknown, allowNegative=false):number {
  const n=Number(value);
  if(!Number.isFinite(n)||(!allowNegative&&n<0)||Math.abs(n)>1e9)throw new Error("Enter a valid quantity.");
  const m=Math.round(n*1000);
  if(Math.abs(n*1000-m)>0.00001)throw new Error("Quantities support up to 3 decimal places.");
  return m;
}
export function quantity(milli:number){return Number((milli/1000).toFixed(3)).toLocaleString(locale,{maximumFractionDigits:3})}
export function localDay(date:Date){
  return new Intl.DateTimeFormat("en-CA",{timeZone:process.env.BUSINESS_TIMEZONE||"Asia/Colombo",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
}
export function displayDate(iso:string){return new Intl.DateTimeFormat(locale,{timeZone:process.env.BUSINESS_TIMEZONE||"Asia/Colombo",year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(iso))}
export function dateOnly(iso:string){return iso.slice(0,10)}
/** Dates entered by users are interpreted in the business time zone's configured UTC offset.
 * For shops using daylight savings, replace this with an IANA-aware date boundary routine. */
export function bounds(start:string,end:string){
  const rx=/^\d{4}-\d{2}-\d{2}$/;
  if(!rx.test(start)||!rx.test(end) || !Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(end))||new Date(start+"T00:00:00Z").toISOString().slice(0,10)!==start||new Date(end+"T00:00:00Z").toISOString().slice(0,10)!==end||start>end) throw new Error("Choose a valid date range.");
  const offset=process.env.BUSINESS_UTC_OFFSET||"+05:30";
  if(!/^[+-]\d{2}:\d{2}$/.test(offset)) throw new Error("Invalid BUSINESS_UTC_OFFSET.");
  const from=new Date(`${start}T00:00:00${offset}`).toISOString();
  const next=new Date(Date.parse(`${end}T00:00:00Z`)+86400000).toISOString().slice(0,10);
  const until=new Date(`${next}T00:00:00${offset}`).toISOString();
  if(new Date(until).getTime()-new Date(from).getTime()>366*86400000*10)throw new Error("Select a range under ten years.");
  return {from,until};
}
export const validCode=(s:string)=>/^[A-Za-z0-9._/-]{1,64}$/.test(s);
