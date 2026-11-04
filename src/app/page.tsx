import {redirect} from "next/navigation";
import {getUser} from "@/lib/auth";
export default async function Home(){const user=await getUser();redirect(user?(user.role==="cashier"?"/pos":"/dashboard"):"/login")}
