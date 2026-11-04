import { NextRequest } from "next/server";
import { authorize,denied,fail,guardOrigin,handleError,ok } from "@/lib/http";
import {client,newId,now,rows} from "@/lib/db";
import {toCents,toMilli,validCode} from "@/lib/format";
import {audit} from "@/lib/auth";

export async function GET(req:NextRequest){
 const user=await authorize();if(denied(user))return user;
 try {
  const exactCode=req.nextUrl.searchParams.get("code");
  if(exactCode){
    const fields=user.role==="cashier"?"id,code,name,category,unit,price,stock_milli,reorder_milli,active":"*";
    const found=await client.execute({sql:`SELECT ${fields} FROM products WHERE code=? AND active=1 LIMIT 1`,args:[exactCode.trim()]});
    return ok({products:rows(found)});
  }
  const q=(req.nextUrl.searchParams.get("q")||"").slice(0,100);
  const includeInactive=req.nextUrl.searchParams.get("all")==="1" && user.role!=="cashier";
  const filter=req.nextUrl.searchParams.get("filter")||"all";
  const page=Math.max(1,Math.min(100000,Math.trunc(Number(req.nextUrl.searchParams.get("page"))||1)));
  const limit=includeInactive?100:80;
  const offset=(page-1)*limit;
  const fields=user.role==="cashier"?"id,code,name,category,unit,price,stock_milli,reorder_milli,active":"*";
  const status=includeInactive?(filter==="low"?"AND active=1 AND stock_milli<=reorder_milli":filter==="active"?"AND active=1":filter==="inactive"?"AND active=0":""):"AND active=1";
  const where=`(name LIKE ? OR code LIKE ? OR category LIKE ?) ${status}`;
  const queryArgs=[`%${q}%`,`%${q}%`,`%${q}%`];
  const [r,count,stats]=await Promise.all([
    client.execute({sql:`SELECT ${fields} FROM products WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,args:[...queryArgs,limit,offset]}),
    client.execute({sql:`SELECT COUNT(*) AS total FROM products WHERE ${where}`,args:queryArgs}),
    client.execute("SELECT SUM(CASE WHEN active=1 THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN active=1 AND stock_milli<=reorder_milli THEN 1 ELSE 0 END) AS low,COUNT(DISTINCT CASE WHEN active=1 THEN category END) AS categories FROM products")
  ]);
  return ok({products:rows(r),total:Number(count.rows[0].total),page,pageSize:limit,stats:rows(stats)[0]});
 }catch(e){return handleError(e)}
}
export async function POST(req:NextRequest){
 const user=await authorize("manager");if(denied(user))return user;if(!guardOrigin(req))return fail("Invalid origin",403);
 try{
  const b=await req.json(); const code=String(b.code||"").trim().toUpperCase();
  const name=String(b.name||"").trim();const category=String(b.category||"General").trim();const unit=String(b.unit||"pcs").trim();
  if(!validCode(code)||name.length<2||name.length>150||category.length>60||unit.length>20)return fail("Check the product code, name, category and unit.");
  const price=toCents(b.price),cost=toCents(b.buyPrice),stock=toMilli(b.stock||0),reorder=toMilli(b.reorder||0);
  const id=newId(),time=now();
  await client.execute({sql:"INSERT INTO products(id,code,name,category,unit,buy_price,price,stock_milli,reorder_milli,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,1,?,?)",args:[id,code,name,category||"General",unit||"pcs",cost,price,stock,reorder,time,time]});
  if(stock>0)await client.execute({sql:"INSERT INTO stock_movements(id,product_id,type,qty_diff_milli,note,user_id,sale_id,created_at) VALUES(?,?,?,?,?,?,NULL,?)",args:[newId(),id,"opening",stock,"Opening stock",user.id,time]});
  await audit(user.id,"product.create",`Created product ${code}`);
  return ok({id},201);
 }catch(e){if(String(e).includes("UNIQUE"))return fail("This product code is already in use.",409);return handleError(e)}
}
