import {redirect,notFound} from "next/navigation";
import {getUser} from "@/lib/auth";
import {client,rows} from "@/lib/db";
import {money,quantity,displayDate} from "@/lib/format";
import {PrintTools} from "@/components/PrintTools";
type Receipt={invoiceNo:string;createdAt:string;cashier:string;shop:{shop_name:string;shop_phone:string;shop_address:string;receipt_footer:string};items:{code:string;name:string;unit:string;qtyMilli:number;unitPrice:number;lineTotal:number}[];subtotal:number;discount:number;total:number;tendered:number;changeDue:number;paymentMethod:string};
export const dynamic="force-dynamic";
export default async function PrintBill({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{paper?:string}>}){
 const user=await getUser();if(!user)redirect("/login");
 const {id}=await params,{paper:rawPaper}=await searchParams;
 const result=rows<{receipt_json:string}>(await client.execute({sql:"SELECT receipt_json FROM sales WHERE id=?",args:[id]}))[0];
 if(!result)notFound();
 const receipt=JSON.parse(result.receipt_json) as Receipt;
 const paper=rawPaper==="a4"?"a4" as const:"thermal" as const;
 return <main className="print-page"><PrintTools id={id} paper={paper}/><article className={`printed-receipt ${paper}`}>
 <header className="bill-header"><h1>{receipt.shop.shop_name}</h1>{receipt.shop.shop_address&&<div style={{whiteSpace:"pre-line"}}>{receipt.shop.shop_address}</div>}{receipt.shop.shop_phone&&<div>Tel: {receipt.shop.shop_phone}</div>}<div style={{marginTop:11,fontWeight:800,letterSpacing:1}}>SALES RECEIPT</div></header>
 <hr/><div className="bill-row"><span>Invoice</span><strong>{receipt.invoiceNo}</strong></div><div className="bill-row"><span>Date</span><span>{displayDate(receipt.createdAt)}</span></div><div className="bill-row"><span>Cashier</span><span>{receipt.cashier}</span></div><div className="bill-row"><span>Method</span><span>{receipt.paymentMethod.toUpperCase()}</span></div><hr/>
 <table><thead><tr><th>Item</th><th className="bill-right">Qty</th><th className="bill-right">Rate</th><th className="bill-right">Amount</th></tr></thead><tbody>{receipt.items.map((it,i)=><tr key={i}><td>{it.name}<div style={{fontSize:9,color:"#777"}}>{it.code} · {it.unit}</div></td><td className="bill-right">{quantity(it.qtyMilli)}</td><td className="bill-right">{money(it.unitPrice)}</td><td className="bill-right">{money(it.lineTotal)}</td></tr>)}</tbody></table>
 <hr/><div className="bill-row"><span>Subtotal</span><span>{money(receipt.subtotal)}</span></div>{receipt.discount>0&&<div className="bill-row"><span>Discount</span><span>- {money(receipt.discount)}</span></div>}<div className="bill-row bill-total" style={{margin:"12px 0"}}><span>TOTAL</span><span>{money(receipt.total)}</span></div>{receipt.paymentMethod==="cash"&&<><div className="bill-row"><span>Cash received</span><span>{money(receipt.tendered)}</span></div><div className="bill-row"><span>Change</span><span>{money(receipt.changeDue)}</span></div></>}
 <hr/><div style={{textAlign:"center",whiteSpace:"pre-wrap"}}>{receipt.shop.receipt_footer}</div><div style={{fontSize:9,textAlign:"center",marginTop:14}}>Receipt copy · {receipt.invoiceNo}</div>
 </article></main>;
}
