import { authorize,denied,handleError,ok } from "@/lib/http";
import {client,rows} from "@/lib/db";
import {localDay} from "@/lib/format";

export async function GET(){
 const u=await authorize("manager");if(denied(u))return u;
 try{
  const day=localDay(new Date());
  const [totals,stock,recent,trend,low]=await Promise.all([
   client.execute({sql:"SELECT COALESCE(SUM(sales_count),0) AS sales, COALESCE(SUM(revenue),0) AS revenue,COALESCE(SUM(cost),0) AS cost,COALESCE(SUM(discounts),0) AS discounts FROM daily_summaries WHERE day=?",args:[day]}),
   client.execute("SELECT COUNT(*) AS count, COALESCE(SUM(stock_milli*buy_price/1000),0) AS cost_value,COALESCE(SUM(stock_milli*price/1000),0) AS retail_value, SUM(CASE WHEN stock_milli<=reorder_milli AND active=1 THEN 1 ELSE 0 END) AS low_count FROM products WHERE active=1"),
   client.execute("SELECT id,invoice_no,total,created_at,payment_method FROM sales ORDER BY created_at DESC LIMIT 6"),
   client.execute("SELECT day,revenue,sales_count FROM daily_summaries ORDER BY day DESC LIMIT 14"),
   client.execute("SELECT id,code,name,unit,stock_milli,reorder_milli FROM products WHERE active=1 AND stock_milli<=reorder_milli ORDER BY stock_milli ASC LIMIT 6"),
  ]);
  return ok({today:rows(totals)[0],stock:rows(stock)[0],recent:rows(recent),trend:rows(trend).reverse(),low:rows(low)});
 }catch(e){return handleError(e)}
}
