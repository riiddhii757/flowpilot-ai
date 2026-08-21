import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
const schema=z.object({organizationId:z.string().min(1),action:z.string().min(1),actor:z.string().min(1),metadata:z.record(z.string(),z.unknown()).optional()});
export async function POST(request:Request){try{const body=schema.parse(await request.json());const log=await db.auditLog.create({data:body});return NextResponse.json({ok:true,log},{status:201})}catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Database error"},{status:400})}}
