import {redirect} from "next/navigation";
import {getUser} from "@/lib/auth";
import AppShell from "@/components/AppShell";
export const dynamic="force-dynamic";
export default async function SecureLayout({children}:{children:React.ReactNode}){
 const user=await getUser();if(!user)redirect("/login");return <AppShell user={user}>{children}</AppShell>;
}
