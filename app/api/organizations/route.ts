import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
const schema=z.object({name:z.string().min(2).max(100),email:z.string().email()});
export async function POST(request:Request){try{const body=schema.parse(await request.json());const org=await db.organization.create({data:{name:body.name,members:{create:{email:body.email,role:"owner"}}},include:{members:true}});return NextResponse.json({ok:true,organization:org},{status:201})}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to create workspace"},{status:400})}}
export async function GET(){const organizations=await db.organization.findMany({include:{members:true,workflows:true},take:20});return NextResponse.json({ok:true,organizations})}
