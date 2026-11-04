import { NextRequest } from "next/server";
import { endSession } from "@/lib/auth";
import { fail, guardOrigin, ok } from "@/lib/http";
export async function POST(req:NextRequest){if(!guardOrigin(req))return fail("Invalid origin",403);await endSession();return ok({success:true})}
