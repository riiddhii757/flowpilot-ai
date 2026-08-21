import { NextResponse } from "next/server";
import { z } from "zod";
import { enqueueWorkflow } from "@/lib/queue";
import { triageRequest } from "@/lib/ai";
const schema=z.object({workflowId:z.string(),organizationId:z.string(),text:z.string().min(3).max(5000)});
export async function POST(request:Request){try{const body=schema.parse(await request.json());const triage=await triageRequest(body.text);const job=await enqueueWorkflow(body.workflowId,{organizationId:body.organizationId,text:body.text,triage});return NextResponse.json({ok:true,status:"queued",jobId:job.id,triage},{status:202})}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Execution failed"},{status:400})}}
