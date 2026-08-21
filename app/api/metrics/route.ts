import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET(){const [tasks,workflows]=await Promise.all([db.task.count(),db.workflow.count()]);return NextResponse.json({ok:true,metrics:{tasks,workflows}})}
