import { NextRequest } from "next/server";
import { authorize,denied,fail,handleError,ok } from "@/lib/http";
import {client,rows} from "@/lib/db";
import {bounds} from "@/lib/format";
export async function GET(req:NextRequest){
 const u=await authorize("manager");if(denied(u))return u;
 try{
  const start=req.nextUrl.searchParams.get("start")||new Date(Date.now()-30*86400000).toISOString().slice(0,10);
  const end=req.nextUrl.searchParams.get("end")||new Date().toISOString().slice(0,10);
  const {from,until}=bounds(start,end);
  const [summary,daily,top,payments,stock]=await Promise.all([
   client.execute({sql:"SELECT COALESCE(SUM(sales_count),0) AS sales,COALESCE(SUM(gross),0) AS gross,COALESCE(SUM(discounts),0) AS discounts,COALESCE(SUM(revenue),0) AS revenue,COALESCE(SUM(cost),0) AS cost FROM daily_summaries WHERE day>=? AND day<=?",args:[start,end]}),
   client.execute({sql:"SELECT day,revenue,cost,sales_count FROM daily_summaries WHERE day>=? AND day<=? ORDER BY day LIMIT 5000",args:[start,end]}),
   client.execute({sql:"SELECT si.code,si.name,SUM(si.qty_milli) AS qty,SUM(si.line_total) AS revenue FROM sale_items si JOIN sales s ON si.sale_id=s.id WHERE s.created_at>=? AND s.created_at<? GROUP BY si.code,si.name ORDER BY revenue DESC LIMIT 8",args:[from,until]}),
   client.execute({sql:"SELECT payment_method,COUNT(*) AS count,SUM(total) AS amount FROM sales WHERE created_at>=? AND created_at<? GROUP BY payment_method",args:[from,until]}),
   client.execute("SELECT COUNT(*) AS products,COALESCE(SUM(stock_milli*buy_price/1000),0) AS stock_cost, COALESCE(SUM(stock_milli*price/1000),0) AS stock_retail FROM products WHERE active=1"),
  ]);
  return ok({summary:rows(summary)[0],daily:rows(daily),top:rows(top),payments:rows(payments),stock:rows(stock)[0],note:"Product and payment breakdowns exclude transactions already purged. Summary totals include archived periods."});
 }catch(e){return fail(e instanceof Error?e.message:"Unable to load report",400)}
}
