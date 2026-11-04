"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useState,useEffect,type ReactNode} from "react";
import {
  LayoutDashboard,
  ScanLine,
  Boxes,
  ReceiptText,
  ChartNoAxesCombined,
  Database,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight
} from "lucide-react";
import {type AuthUser} from "@/lib/auth";
import {api} from "@/lib/client";

const nav=[
  {name:"Overview",href:"/dashboard",icon:LayoutDashboard,manager:true},
  {name:"POS Terminal",href:"/pos",icon:ScanLine},
  {name:"Products & Stock",href:"/products",icon:Boxes},
  {name:"Sales & Receipts",href:"/sales",icon:ReceiptText},
  {name:"Reports & Insights",href:"/reports",icon:ChartNoAxesCombined,manager:true},
  {name:"Export & Archive",href:"/archive",icon:Database,owner:true},
  {name:"Team Access",href:"/team",icon:Users,owner:true},
  {name:"Shop Settings",href:"/settings",icon:Settings,owner:true}
];

export default function AppShell({user,children}:{user:AuthUser;children:ReactNode}){
  const [collapsed,setCollapsed]=useState(false);
  const [signing,setSigning]=useState(false);
  const pathname=usePathname(),router=useRouter();
  const active=nav.find(x=>x.href===pathname);

  // In tablet view (<= 1024px), collapse sidebar by default to provide the full laptop experience
  useEffect(()=>{
    function handleResize(){
      if(window.innerWidth<=1024){
        setCollapsed(true);
      }
    }
    handleResize();
  },[]);

  async function signOut(){
    setSigning(true);
    try{
      await api("/api/auth/logout",{method:"POST"});
      router.replace("/login");
      router.refresh();
    }finally{
      setSigning(false);
    }
  }

  return (
    <div className={`layout ${collapsed?"sidebar-collapsed":""}`}>
      {/* Tablet overlay when sidebar is expanded */}
      <div
        onClick={()=>setCollapsed(true)}
        className={`overlay ${!collapsed?"show-tablet":""}`}
      />

      <aside className={`sidebar ${collapsed?"collapsed":""}`}>
        <div className="brand" style={{padding:"0 4px 20px",borderBottom:"1px solid #303239",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <img src="/logo-sidebar.png" alt="Handyman Hardware" style={{height:38,maxWidth:"175px",objectFit:"contain"}} />
          <button
            className="sidebar-hide-arrow"
            onClick={()=>setCollapsed(true)}
            title="Hide sidebar"
            aria-label="Hide sidebar"
          >
            <ChevronLeft size={19} />
          </button>
        </div>
        <div className="nav-label">Workspace</div>
        <nav className="nav" aria-label="Main navigation">
          {nav.filter(n=>(!n.manager||user.role!=="cashier")&&(!n.owner||user.role==="owner")).map(n=>(
            <Link
              key={n.href}
              href={n.href}
              className={`nav-link ${pathname===n.href?"active":""}`}
              onClick={()=>{
                if(typeof window!=="undefined"&&window.innerWidth<=1024){
                  setCollapsed(true);
                }
              }}
            >
              <n.icon size={17} strokeWidth={1.9}/>
              {n.name}
              {n.href==="/pos"&&<ArrowUpRight size={13} style={{marginLeft:"auto",opacity:.45}}/>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-spacer"/>
        <div className="sidebar-foot">
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <ShieldCheck size={19} color="#f16b70"/>
            <div style={{fontSize:12,fontWeight:800}}>Private workspace</div>
          </div>
          <p>Secure access, live stock and every transaction under control.</p>
          <button
            className="nav-link"
            onClick={signOut}
            disabled={signing}
            style={{border:0,background:"none",paddingLeft:0,marginTop:15}}
          >
            <LogOut size={16}/> {signing?"Signing out...":"Sign out"}
          </button>
        </div>
      </aside>

      {/* Floating arrow tab on screen edge when sidebar is collapsed */}
      {collapsed&&(
        <button
          className="floating-slide-tab"
          onClick={()=>setCollapsed(false)}
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <ChevronRight size={18}/>
        </button>
      )}

      <div className="main-area">
        <header className="topbar">
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <button
              className="sidebar-arrow-btn"
              onClick={()=>setCollapsed(!collapsed)}
              title={collapsed?"Expand sidebar":"Hide sidebar"}
              aria-label="Toggle sidebar"
            >
              {collapsed?<ChevronRight size={19}/>:<ChevronLeft size={19}/>}
            </button>
            <div className="topbar-label">
              Workspace <span style={{color:"#b8bbc2",margin:"0 9px"}}>/</span> <strong>{active?.name||"Dashboard"}</strong>
            </div>
          </div>
          <div className="topbar-right">
            <div className="user-meta"><strong>{user.display_name}</strong><small>{user.role}</small></div>
          </div>
        </header>
        <main className="workarea">{children}</main>
      </div>
    </div>
  );
}
