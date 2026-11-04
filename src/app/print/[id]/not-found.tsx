import Link from "next/link";
export default function NotFound(){return <main style={{maxWidth:550,margin:"12vh auto",padding:25,textAlign:"center"}}><h1>Invoice unavailable</h1><p>It may have been deleted after a completed archive, or the invoice number is invalid.</p><Link href="/sales" className="btn btn-primary">Back to Sales</Link></main>}
