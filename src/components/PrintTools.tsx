"use client";
import Link from "next/link";
import {Printer,ArrowLeft,ReceiptText} from "lucide-react";
export function PrintTools({id,paper}:{id:string;paper:"a4"|"thermal"}){return <div className="print-tools"><button className="btn btn-primary" onClick={()=>window.print()}><Printer size={16}/> Print / Save PDF</button><a className="btn btn-outline" href={`/print/${id}?paper=${paper==="a4"?"thermal":"a4"}`}><ReceiptText size={16}/> Switch to {paper==="a4"?"80mm thermal":"A4"}</a><Link className="btn btn-outline" href="/sales"><ArrowLeft size={16}/> Sales</Link></div>}
