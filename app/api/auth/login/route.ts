import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, passwordHash } from "@/lib/auth";
const schema=z.object({email:z.string().email(),password:z.string().min(8)});
export async function POST(request:Request){try{const body=schema.parse(await request.json());const user=await db.user.findUnique({where:{email:body.email.toLowerCase()}});if(!user||user.passwordHash!==passwordHash(body.password))return NextResponse.json({error:"Invalid email or password"},{status:401});await createSession(user.id);return NextResponse.json({ok:true});}catch(e){return NextResponse.json({error:"Invalid request"},{status:400})}}
