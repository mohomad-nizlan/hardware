import "./globals.css";
import type {Metadata} from "next";
export const metadata:Metadata={title:{default:"Handyman Hardware | POS",template:"%s | Handyman Hardware"},description:"Point-of-sale and inventory management system for Handyman Hardware",robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
