import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
const schema=z.object({organizationId:z.string(),title:z.string().min(2),workflowId:z.string().optional(),priority:z.enum(["low","normal","high","urgent"]).default("normal")});
export async function POST(request:Request){try{const body=schema.parse(await request.json());const task=await db.task.create({data:body});return NextResponse.json({ok:true,task},{status:201})}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to create task"},{status:400})}}
export async function GET(){const tasks=await db.task.findMany({orderBy:{createdAt:"desc"},take:50});return NextResponse.json({ok:true,tasks})}
