import { NextResponse } from "next/server";
import { z } from "zod";

const integrationSchema = z.object({ provider: z.enum(["slack", "email", "webhook", "crm"]), enabled: z.boolean() });
export async function GET(){return NextResponse.json({ok:true,integrations:[{provider:"slack",enabled:false},{provider:"email",enabled:true},{provider:"webhook",enabled:true},{provider:"crm",enabled:false}]})}
export async function POST(request:Request){const body=integrationSchema.parse(await request.json());return NextResponse.json({ok:true,integration:body},{status:201})}
