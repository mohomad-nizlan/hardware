"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowUpRight,Boxes,ShoppingCart,Wallet,TriangleAlert,Plus,ArrowRight,ReceiptText,Package,ScanLine} from "lucide-react";
import {api} from "@/lib/client";
import {money,quantity,displayDate} from "@/lib/format";
import {Heading,Panel,Button,Loading,Empty,Message} from "@/components/Ui";
type Overview={today:{sales:number;revenue:number;cost:number;discounts:number};stock:{count:number;low_count:number;cost_value:number;retail_value:number};recent:{id:string;invoice_no:string;total:number;created_at:string;payment_method:string}[];trend:{day:string;revenue:number;sales_count:number}[];low:{id:string;code:string;name:string;stock_milli:number;reorder_milli:number;unit:string}[]};
export default function DashboardClient(){const [data,setData]=useState<Overview|null>(null),[error,setError]=useState("");
 useEffect(()=>{api<Overview>("/api/overview").then(setData).catch(e=>setError(e.message))},[]);
 const top=data?.trend||[];const max=Math.max(1,...top.map(x=>x.revenue));
 return <><Heading kicker="BUSINESS COMMAND CENTER" title="Overview dashboard" description="A clear view of your business, sales and stock — all in one place."><Link href="/pos" className="btn btn-primary"><ScanLine size={16}/> Open POS terminal</Link></Heading><Message text={error} error/>{!data&&!error?<Loading/>:data&&<>
  <div className="stat-grid">
   <div className="card stat"><div className="stat-icon red"><Wallet size={19}/></div><p>Today's revenue</p><h2>{money(data.today.revenue)}</h2><div className="stat-bottom"><p>Completed sales only</p><span className="mini-tag">LIVE</span></div></div>
   <div className="card stat"><div className="stat-icon"><ShoppingCart size={19}/></div><p>Sales today</p><h2>{Number(data.today.sales).toLocaleString()}</h2><div className="stat-bottom"><p>Successful checkouts</p><span className="badge">Today</span></div></div>
   <div className="card stat"><div className="stat-icon green"><Boxes size={19}/></div><p>Stock cost value</p><h2>{money(data.stock.cost_value)}</h2><div className="stat-bottom"><p>{Number(data.stock.count)} active products</p><span className="badge good">Stock</span></div></div>
   <div className="card stat"><div className="stat-icon red"><TriangleAlert size={19}/></div><p>Low-stock products</p><h2>{Number(data.stock.low_count||0)}</h2><div className="stat-bottom"><p>Items to replenish</p><Link className="link-red" href="/products">Manage <ArrowUpRight size={12} style={{display:"inline"}}/></Link></div></div>
  </div>
  <div className="section-grid">
   <Panel title="Revenue performance" sub="Daily paid sales • last 14 recorded days" action={<Link href="/reports" className="link-red">View analytics <ArrowUpRight size={13} style={{display:"inline"}}/></Link>}>
    {top.length?<div className="bar-chart-wrap"><div className="bars">{top.map(x=><div key={x.day} className="bar-slot" title={`${x.day}: ${money(x.revenue)}`}><div className="bar-fill" style={{height:`${Math.max(2,x.revenue/max*100)}%`}}/><span>{x.day.slice(5)}</span></div>)}</div></div>:<Empty>Revenue will appear here after your first completed sale.</Empty>}
    <div className="divider"/><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}><div><div className="hint">Today's estimated gross profit</div><strong style={{fontSize:20}}>{money(data.today.revenue-data.today.cost)}</strong></div><span className="badge">Revenue less item cost</span></div>
   </Panel>
   <Panel title="Stock alerts" sub="Products at or below their reorder level" action={<Link href="/products" className="link-red">All products</Link>}>
    <div className="alert-list">{data.low.length?data.low.map(p=><div className="alert-row" key={p.id}><div><strong>{p.name}</strong><small>{p.code} · Reorder at {quantity(p.reorder_milli)} {p.unit}</small></div><span className="qty-warning">{quantity(p.stock_milli)} left</span></div>):<Empty><Package size={24}/><div>No low-stock products right now.</div></Empty>}</div>
    <Link href="/products" className="btn btn-outline btn-full" style={{marginTop:18}}>Manage inventory <ArrowRight size={14}/></Link>
   </Panel>
  </div>
  <div className="section-grid">
   <Panel title="Recent transactions" sub="Latest completed purchases" action={<Link href="/sales" className="link-red">See all sales <ArrowUpRight size={13} style={{display:"inline"}}/></Link>}>
    <div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Date & time</th><th>Method</th><th>Amount</th><th/></tr></thead><tbody>{data.recent.map(s=><tr key={s.id}><td><strong>{s.invoice_no}</strong></td><td>{displayDate(s.created_at)}</td><td><span className="badge">{s.payment_method}</span></td><td className="row-primary">{money(s.total)}</td><td><Link className="link-red" href={`/print/${s.id}?paper=thermal`} target="_blank">Print</Link></td></tr>)}</tbody></table>{!data.recent.length&&<Empty>Receipts will appear here once sales are completed.</Empty>}</div>
   </Panel>
   <Panel title="Quick actions" sub="Get things done in fewer clicks">
    <div style={{display:"grid",gap:11}}><Link href="/pos" className="download-option" style={{margin:0}}><div style={{display:"flex",gap:12,alignItems:"center"}}><div className="product-plus"><ScanLine size={18}/></div><div><strong style={{fontSize:12}}>Start new sale</strong><div className="hint">Scan items and collect payment</div></div></div><ArrowRight size={16}/></Link><Link href="/products" className="download-option" style={{margin:0}}><div style={{display:"flex",gap:12,alignItems:"center"}}><div className="product-plus"><Plus size={18}/></div><div><strong style={{fontSize:12}}>Inventory</strong><div className="hint">Browse stock and product codes</div></div></div><ArrowRight size={16}/></Link><Link href="/sales" className="download-option" style={{margin:0}}><div style={{display:"flex",gap:12,alignItems:"center"}}><div className="product-plus"><ReceiptText size={18}/></div><div><strong style={{fontSize:12}}>Find an invoice</strong><div className="hint">Print previous customer bills</div></div></div><ArrowRight size={16}/></Link></div>
   </Panel>
  </div>
 </>}</>}
