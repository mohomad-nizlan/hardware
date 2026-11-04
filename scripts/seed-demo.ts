import {config} from "dotenv";
config({path:".env.local"});config();
import {createClient} from "@libsql/client";
import {randomUUID} from "node:crypto";
if(!(process.env.TURSO_DATABASE_URL||"file:local.db").startsWith("file:")){
 console.error("Safety: demo data seeding is restricted to local SQLite databases.");process.exit(1);
}
const products:[string,string,string,string,number,number,number,number][]=[
 ["HAM-016","Claw Hammer 16 oz","Hand Tools","pcs",1850,2900,24,5],
 ["SCR-SET-10","Screwdriver Set 10 pcs","Hand Tools","set",2700,4200,12,3],
 ["PVC-ELB-20","PVC Elbow 20 mm","Plumbing","pcs",85,145,145,20],
 ["PVC-PIPE-20","PVC Pipe 20 mm","Plumbing","metre",195,340,100.5,15],
 ["TAPE-PTFE","PTFE Thread Seal Tape","Plumbing","roll",75,150,96,15],
 ["NAILS-2IN","Steel Nails 2 inch","Fasteners","kg",320,525,75.25,10],
 ["SCREW-25","Wood Screws 25 mm","Fasteners","box",300,520,70,10],
 ["SWITCH-1G","One Gang Wall Switch","Electrical","pcs",280,470,36,6],
 ["SOCKET-13A","13A Universal Socket","Electrical","pcs",450,720,38,7],
 ["WIRE-15-B","Electrical Cable 1.5 mm Black","Electrical","metre",130,205,340.75,40],
 ["LED-BULB-9W","LED Bulb 9W Warm White","Electrical","pcs",350,590,52,10],
 ["CEMENT-50","Cement Bag 50 kg","Building Materials","bag",1880,2280,34,10],
 ["SAND-25","Washed Sand 25 kg","Building Materials","bag",360,550,55,12],
 ["GLUE-PVC-100","PVC Solvent Cement 100 ml","Adhesives","pcs",235,410,22,6],
 ["PAINT-BRUSH-2","Paint Brush 2 inch","Painting","pcs",190,320,45,10],
 ["MASK-TAPE-1","Masking Tape 1 inch","Painting","roll",170,280,38,10],
 ["DRILL-BIT-6","Masonry Drill Bit 6 mm","Power Tools","pcs",250,410,26,5],
 ["CUT-DISC-4","Metal Cutting Disc 4 inch","Power Tools","pcs",140,235,60,10],
];
(async()=>{const db=createClient({url:process.env.TURSO_DATABASE_URL||"file:local.db"});const count=await db.execute("SELECT COUNT(*) AS count FROM products");if(Number(count.rows[0].count)>0){console.log("Products already exist. No demo data inserted.");return}
 for(const [code,name,category,unit,cost,price,stock,reorder] of products){const id=randomUUID(),now=new Date().toISOString();await db.execute({sql:"INSERT INTO products(id,code,name,category,unit,buy_price,price,stock_milli,reorder_milli,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,1,?,?)",args:[id,code,name,category,unit,Math.round(cost*100),Math.round(price*100),Math.round(stock*1000),Math.round(reorder*1000),now,now]});}
 console.log(`Added ${products.length} sample hardware products (local development only).`);
 db.close();})().catch(e=>{console.error(e);process.exit(1)});
