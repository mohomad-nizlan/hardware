import {redirect} from "next/navigation";
import {getUser} from "@/lib/auth";
import DashboardClient from "@/components/DashboardClient";
export const dynamic="force-dynamic";
export default async function Dashboard(){const user=await getUser();if(!user)redirect("/login");if(user.role==="cashier")redirect("/pos");return <DashboardClient/>}
