"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {
  ScanBarcode,Search,Plus,Minus,ShoppingCart,Trash2,CreditCard,Banknote,Landmark,
  ReceiptText,CheckCircle2,Printer,ArrowLeft,PackageX,Keyboard,RotateCcw,Check,List,LayoutGrid,X
} from "lucide-react";
import {api,jsonBody} from "@/lib/client";
import {money,quantity} from "@/lib/format";
import {Heading,Panel,Button,Field,Message,Modal,Loading,Empty} from "@/components/Ui";

type Product={id:string;code:string;name:string;category:string;unit:string;price:number;stock_milli:number;active:number};
type CartItem={product:Product;qty:number};

export default function Pos(){
  const [query,setQuery]=useState(""),[products,setProducts]=useState<Product[]>([]),[cart,setCart]=useState<CartItem[]>([]),[searching,setSearching]=useState(false);
  const [method,setMethod]=useState("cash"),[discount,setDiscount]=useState("0"),[tender,setTender]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState<{id:string;invoiceNo:string}|null>(null);
  const [selectedCat,setSelectedCat]=useState("All");
  const [view,setView]=useState<"rows"|"grid">("rows");
  const scanInput=useRef<HTMLInputElement>(null);

  // Default to row view on tablet screens (<= 1024px) for better touch ergonomics
  useEffect(()=>{
    if(typeof window!=="undefined"&&window.innerWidth<=1024){
      setView("rows");
    }
  },[]);

  useEffect(()=>{
    const timer=setTimeout(()=>{
      setSearching(true);
      api<{products:Product[]}>(`/api/products?q=${encodeURIComponent(query)}`)
        .then(d=>setProducts(d.products))
        .catch(e=>setError(e.message))
        .finally(()=>setSearching(false));
    },140);
    return()=>clearTimeout(timer);
  },[query,success]);

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==="F2"){
        e.preventDefault();
        scanInput.current?.focus();
        scanInput.current?.select();
      }
    };
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[]);

  // Map of product ID -> quantity currently in cart
  const cartQtyMap=useMemo(()=>{
    const map:Record<string,number>={};
    for(const item of cart){
      map[item.product.id]=(map[item.product.id]||0)+item.qty;
    }
    return map;
  },[cart]);

  // Unique categories for quick filtering
  const categories=useMemo(()=>{
    const cats=new Set<string>();
    for(const p of products){
      if(p.category)cats.add(p.category);
    }
    return ["All",...Array.from(cats)];
  },[products]);

  const filteredProducts=useMemo(()=>{
    let list=products.filter(p=>p.active);
    if(selectedCat!=="All"){
      list=list.filter(p=>p.category===selectedCat);
    }
    return list;
  },[products,selectedCat]);

  const add=(p:Product)=>{
    setError("");
    if(p.stock_milli<=0)return setError(`${p.name} is out of stock.`);
    setCart(old=>{
      const found=old.find(x=>x.product.id===p.id);
      if(found)return old.map(x=>x.product.id===p.id?{...x,qty:Math.min(p.stock_milli/1000,Math.round((x.qty+1)*1000)/1000)}:x);
      return [...old,{product:p,qty:1>p.stock_milli/1000?p.stock_milli/1000:1}];
    });
    setQuery("");
    scanInput.current?.focus();
  };

  const updateQty=(id:string,n:number)=>{
    if(!Number.isFinite(n)||n<=0)return;
    setCart(c=>c.map(x=>x.product.id===id?{...x,qty:Math.min(x.product.stock_milli/1000,Math.round(n*1000)/1000)}:x));
  };

  const resetCart=()=>{
    setCart([]);
    setDiscount("0");
    setTender("");
    setError("");
    scanInput.current?.focus();
  };

  const subtotal=useMemo(()=>cart.reduce((sum,x)=>sum+Math.round(x.product.price*x.qty),0),[cart]);
  const discountCents=Math.max(0,Math.round((Number(discount)||0)*100)),total=Math.max(0,subtotal-discountCents),cashCents=Math.max(0,Math.round((Number(tender)||0)*100));
  const change=cashCents-total;

  async function checkout(){
    setError("");
    if(!cart.length)return setError("Add at least one product.");
    if(discountCents>subtotal)return setError("Discount exceeds the sale subtotal.");
    if(method==="cash"&&cashCents<total)return setError("The cash received is less than the total.");
    setBusy(true);
    try{
      const result=await api<{id:string;invoiceNo:string}>("/api/sales",jsonBody({
        items:cart.map(x=>({productId:x.product.id,quantity:x.qty})),
        discount:Number(discount)||0,
        paymentMethod:method,
        tendered:method==="cash"?Number(tender)||0:0
      }));
      setSuccess(result);
      setCart([]);
      setDiscount("0");
      setTender("");
      setQuery("");
    }catch(e){
      setError((e as Error).message);
    }finally{
      setBusy(false);
    }
  }

  async function handleScan(e:React.KeyboardEvent<HTMLInputElement>){
    if(e.key!=="Enter")return;
    e.preventDefault();
    const code=query.trim();
    if(!code)return;
    try{
      const d=await api<{products:Product[]}>(`/api/products?code=${encodeURIComponent(code)}`);
      if(d.products[0])add(d.products[0]);
      else if(filteredProducts.length===1)add(filteredProducts[0]);
      else setError("No exact product code match. Choose a product from the results.");
    }catch(e){
      setError((e as Error).message);
    }
  }

  return (
    <>
      <Heading kicker="FAST CHECKOUT" title="POS terminal" description="Scan a product code or tap to add items. Live stock and bill update instantly.">
        <span className="badge"><Keyboard size={11} style={{verticalAlign:"middle"}}/> F2 to scan</span>
      </Heading>
      <Message text={error} error/>

      <div className="pos-layout">
        {/* Left Catalog Panel */}
        <div className="card card-pad pos-catalog">
          <div className="pos-catalog-header">
            <div className="card-titlebar" style={{marginBottom:12}}>
              <div>
                <h2 className="section-title">Product catalog</h2>
                <p className="hint" style={{margin:"3px 0 0"}}>Select an item to add to the current bill.</p>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                {/* View toggle: Rows vs Grid */}
                <div className="view-toggle">
                  <button
                    type="button"
                    className={`view-btn ${view==="rows"?"active":""}`}
                    onClick={()=>setView("rows")}
                    title="Row / List view"
                    aria-label="Row view"
                  >
                    <List size={14}/>
                  </button>
                  <button
                    type="button"
                    className={`view-btn ${view==="grid"?"active":""}`}
                    onClick={()=>setView("grid")}
                    title="Grid view"
                    aria-label="Grid view"
                  >
                    <LayoutGrid size={14}/>
                  </button>
                </div>
                <span className="badge">{filteredProducts.length} shown</span>
              </div>
            </div>

            {/* Search Input */}
            <div className="search-wrap">
              <ScanBarcode size={19}/>
              <input
                ref={scanInput}
                className="input search-input"
                style={{height:46}}
                autoFocus
                placeholder="Scan barcode, type code or search item name..."
                value={query}
                onChange={e=>setQuery(e.target.value)}
                onKeyDown={handleScan}
              />
              {query&&(
                <button
                  type="button"
                  onClick={()=>{setQuery("");scanInput.current?.focus()}}
                  style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",border:0,background:"none",color:"#8f94a0",cursor:"pointer"}}
                  title="Clear search"
                >
                  <X size={16}/>
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            {categories.length>2&&(
              <div className="category-filter-bar">
                {categories.map(c=>(
                  <button
                    key={c}
                    type="button"
                    className={`cat-pill ${selectedCat===c?"active":""}`}
                    onClick={()=>setSelectedCat(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scrollable Product Area */}
          <div className="pos-products-scroll">
            {searching?<Loading/>:view==="rows"?(
              <div className="pos-products rows">
                {filteredProducts.slice(0,80).map(p=>{
                  const inCartQty=cartQtyMap[p.id]||0;
                  return (
                    <button
                      key={p.id}
                      className={`pos-product-row ${inCartQty>0?"in-cart":""}`}
                      disabled={p.stock_milli<=0}
                      onClick={()=>add(p)}
                    >
                      <div className="row-main">
                        <div className="row-title-line">
                          <span className="code" style={{padding:"2px 6px",fontSize:11}}>{p.code}</span>
                          <h3>{p.name}</h3>
                        </div>
                        <div className="row-meta">
                          <span>{p.category}</span>
                          <span>•</span>
                          <span style={{color:p.stock_milli<=5000?"#c52e35":"#656a73",fontWeight:p.stock_milli<=5000?700:400}}>
                            {quantity(p.stock_milli)} {p.unit} left
                          </span>
                        </div>
                      </div>

                      <div className="row-right">
                        <div className="row-price">
                          <strong>{money(p.price)}</strong>
                          <div style={{fontWeight:400,color:"#8a8f9b",fontSize:10}}>per {p.unit}</div>
                        </div>

                        {inCartQty>0&&(
                          <span className="in-cart-pill">
                            <Check size={11} strokeWidth={3}/>
                            {quantity(inCartQty*1000)} in bill
                          </span>
                        )}

                        <div className={`product-plus ${inCartQty>0?"plus-green":""}`}>
                          {p.stock_milli<=0?<PackageX size={15}/>:<Plus size={16}/>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ):(
              <div className="pos-products">
                {filteredProducts.slice(0,80).map(p=>{
                  const inCartQty=cartQtyMap[p.id]||0;
                  return (
                    <button
                      key={p.id}
                      className={`pos-product ${inCartQty>0?"in-cart":""}`}
                      disabled={p.stock_milli<=0}
                      onClick={()=>add(p)}
                    >
                      <div style={{flex:1,minWidth:0}}>
                        <h3>{p.name}</h3>
                        <p>
                          <span className="code" style={{padding:"3px 6px"}}>{p.code}</span> · {quantity(p.stock_milli)} {p.unit} left
                        </p>
                        {inCartQty>0&&(
                          <div style={{marginBottom:8}}>
                            <span className="in-cart-pill">
                              <Check size={11} strokeWidth={3}/>
                              {quantity(inCartQty*1000)} in bill
                            </span>
                          </div>
                        )}
                        <strong>{money(p.price)} <span style={{fontWeight:400,color:"#9da1a7",fontSize:10}}>/ {p.unit}</span></strong>
                      </div>
                      <div className={`product-plus ${inCartQty>0?"plus-green":""}`}>
                        {p.stock_milli<=0?<PackageX size={15}/>:<Plus size={17}/>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {!searching&&!filteredProducts.length&&(
              <Empty>
                <Search size={23}/>
                <div>No products found matching your filter.</div>
              </Empty>
            )}
          </div>
        </div>

        {/* Right Current Bill Panel (Sticky with internal scroll) */}
        <div className="card card-pad cart-panel">
          <div className="card-titlebar" style={{marginBottom:10,flexShrink:0}}>
            <div>
              <h2 className="section-title">Current bill</h2>
              <p className="hint" style={{margin:"2px 0 0"}}>Live customer checkout</p>
            </div>
            <div style={{display:"flex",gap:7,alignItems:"center"}}>
              {cart.length>0&&(
                <button
                  type="button"
                  className="btn btn-small btn-danger"
                  style={{padding:"4px 9px",fontSize:11,gap:4,minHeight:28}}
                  onClick={resetCart}
                  title="Clear all items in current bill"
                >
                  <RotateCcw size={12}/> Reset
                </button>
              )}
              <span className="badge">{cart.length} items</span>
            </div>
          </div>

          {/* Scrollable list of items in bill */}
          <div className="cart-items">
            {cart.length?cart.map(x=>(
              <div className="cart-item" key={x.product.id}>
                <div>
                  <strong>{x.product.name}</strong>
                  <small>{x.product.code} · {money(x.product.price)} / {x.product.unit}</small>
                  <div className="cart-qty">
                    <button className="qty-btn" aria-label="Decrease quantity" onClick={()=>updateQty(x.product.id,x.qty-1)}>
                      <Minus size={12}/>
                    </button>
                    <input
                      className="qty-input"
                      inputMode="decimal"
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={x.qty}
                      onChange={e=>updateQty(x.product.id,Number(e.target.value))}
                    />
                    <button className="qty-btn" aria-label="Increase quantity" onClick={()=>updateQty(x.product.id,x.qty+1)}>
                      <Plus size={12}/>
                    </button>
                    <button
                      className="qty-btn"
                      aria-label="Remove item"
                      style={{marginLeft:7,color:"#ca343a"}}
                      onClick={()=>setCart(c=>c.filter(z=>z.product.id!==x.product.id))}
                    >
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>
                <strong style={{fontSize:12}}>{money(Math.round(x.product.price*x.qty))}</strong>
              </div>
            )):(
              <Empty>
                <ShoppingCart size={24}/>
                <div>Your bill is empty.</div>
                <div style={{marginTop:4}}>Select products from the catalog.</div>
              </Empty>
            )}
          </div>

          {/* Sticky/Pinned Checkout Footer */}
          <div className="cart-footer">
            <div className="divider" style={{margin:"12px 0 10px"}}/>
            <div className="cart-summary">
              <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
              <div style={{alignItems:"center"}}>
                <span>Discount (amount)</span>
                <input
                  className="input"
                  style={{width:105,textAlign:"right",minHeight:34,padding:"4px 8px",fontSize:12}}
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={e=>setDiscount(e.target.value)}
                />
              </div>
            </div>

            <div className="cart-total" style={{margin:"12px 0 10px",padding:"14px 16px"}}>
              <div>
                <small style={{fontSize:10}}>AMOUNT TO PAY</small>
                <div style={{fontSize:10,color:"#aeb0b8",marginTop:2}}>All items included</div>
              </div>
              <strong style={{fontSize:22}}>{money(total)}</strong>
            </div>

            <div className="section-heading" style={{marginBottom:8,fontSize:11}}>Payment method</div>
            <div className="payment-types">
              {[
                {value:"cash",icon:Banknote,label:"Cash"},
                {value:"card",icon:CreditCard,label:"Card"},
                {value:"bank",icon:Landmark,label:"Bank"}
              ].map(p=>(
                <button
                  key={p.value}
                  className={`pay-option ${method===p.value?"selected":""}`}
                  onClick={()=>setMethod(p.value)}
                  style={{padding:"8px 6px"}}
                >
                  <p.icon size={15}/>{p.label}
                </button>
              ))}
            </div>

            {method==="cash"&&(
              <div style={{marginTop:10}}>
                <Field label="CASH RECEIVED">
                  <input
                    className="input"
                    style={{minHeight:36,padding:"6px 10px",fontSize:12}}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={tender}
                    onChange={e=>setTender(e.target.value)}
                  />
                </Field>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:11}}>
                  <span style={{color:"#8a8f99"}}>Change to return</span>
                  <strong style={{color:change>=0?"#168262":"#d13b40",fontSize:12}}>{money(Math.max(0,change))}</strong>
                </div>
              </div>
            )}

            <div style={{marginTop:12}}>
              <Button className="btn-full" onClick={checkout} disabled={busy||!cart.length}>
                {busy?"Processing sale...":"Complete sale & create bill"}
                <ReceiptText size={16}/>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {success&&(
        <Modal title="Sale completed" onClose={()=>setSuccess(null)}>
          <div className="success-text">
            <div className="success-mark"><CheckCircle2 size={34}/></div>
            <h2 style={{fontSize:23,marginBottom:9}}>Payment recorded!</h2>
            <p className="subtitle">Invoice <strong>{success.invoiceNo}</strong> has been saved, and stock has been updated.</p>
          </div>
          <div style={{display:"grid",gap:9,marginTop:22}}>
            <a className="btn btn-primary btn-full" href={`/print/${success.id}?paper=thermal`} target="_blank" rel="noopener noreferrer">
              <Printer size={16}/> Print thermal receipt (80 mm)
            </a>
            <a className="btn btn-outline btn-full" href={`/print/${success.id}?paper=a4`} target="_blank" rel="noopener noreferrer">
              <Printer size={16}/> Print A4 invoice
            </a>
            <Button className="btn-full" variant="ghost" onClick={()=>{setSuccess(null);scanInput.current?.focus()}}>
              Start next customer <ArrowLeft size={15}/>
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
