import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/oauth";

const integrationSchema = z.object({
  provider: z.enum(["slack", "email", "webhook", "crm", "google-calendar", "google-gmail", "calendly", "zapier"]),
  enabled: z.boolean(), webhookUrl: z.string().url().optional(), action: z.enum(["connect", "send-test"]).optional(),
});
const providers = ["slack", "email", "webhook", "crm", "google-calendar", "google-gmail", "calendly", "zapier"] as const;
type IntegrationRow = { enabled:boolean; accessToken:string|null; refreshToken:string|null; webhookUrl:string|null; accountEmail?:string|null };
function resendKey(){return process.env.RESEND_API_KEY?.trim()||null}
async function sendResendTestEmail(to:string){const key=resendKey();if(!key)return{ok:false,message:"RESEND_API_KEY is not available to this Vercel deployment."};const from=process.env.RESEND_FROM_EMAIL?.trim()||"onboarding@resend.dev";const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},body:JSON.stringify({from:`FlowPilot <${from}>`,to:[to],subject:"FlowPilot Email Integration Test",html:"<h2>FlowPilot Email is working</h2><p>This test confirms that FlowPilot can send email through Resend.</p>"})});const data=await response.json().catch(()=>null);if(!response.ok)return{ok:false,message:data?.message||"Resend rejected the test email.",status:response.status};return{ok:true,id:data?.id||null}}
async function isRealConnection(provider:string,row:IntegrationRow|undefined){if(!row?.enabled)return false;if(provider==="slack")return Boolean(row.accessToken);if(provider==="google-calendar"||provider==="google-gmail")return Boolean(row.accessToken&&row.refreshToken);if(provider==="zapier")return Boolean(row.webhookUrl);if(provider==="email")return Boolean(row.accessToken);return false}
export async function GET(){const user=await getCurrentUser();if(!user||!user.members[0])return NextResponse.json({error:"Authentication required"},{status:401});const rows=await db.integration.findMany({where:{organizationId:user.members[0].organizationId}});const integrations=await Promise.all(providers.map(async provider=>{const row=rows.find(item=>item.provider===provider);const verified=await isRealConnection(provider,row);return{provider,enabled:verified,accountEmail:verified?row?.accountEmail||(provider==="email"?process.env.RESEND_FROM_EMAIL||null:null):null}}));return NextResponse.json({ok:true,integrations})}
export async function POST(request:Request){const user=await getCurrentUser();if(!user||!user.members[0])return NextResponse.json({error:"Authentication required"},{status:401});const body=integrationSchema.parse(await request.json());const organizationId=user.members[0].organizationId;if(body.provider==="email"){const action=body.action||"connect";if(action==="send-test"){const result=await sendResendTestEmail(user.email);if(!result.ok)return NextResponse.json({error:result.message},{status:result.status||400});const integration=await db.integration.upsert({where:{organizationId_provider:{organizationId,provider:"email"}},create:{userId:user.id,organizationId,provider:"email",enabled:true,accessToken:"resend-env",accountEmail:user.email},update:{enabled:true,accessToken:"resend-env",accountEmail:user.email}});return NextResponse.json({ok:true,sent:true,emailId:result.id,integration:{provider:integration.provider,enabled:true,accountEmail:integration.accountEmail}})}const key=resendKey();if(!key||!key.startsWith("re_")||key.length<20)return NextResponse.json({error:"RESEND_API_KEY is missing or invalid in the deployed environment."},{status:400});return NextResponse.json({ok:true,requiresTestEmail:true,message:"Credentials are configured. Send a real test email to finish connecting Email."})}
if(body.provider!=="zapier")return NextResponse.json({error:"This integration must be connected through its dedicated setup flow"},{status:400});if(!body.webhookUrl)return NextResponse.json({error:"Zapier webhook URL is required"},{status:400});const integration=await db.integration.upsert({where:{organizationId_provider:{organizationId,provider:body.provider}},create:{userId:user.id,organizationId,provider:body.provider,enabled:true,webhookUrl:body.webhookUrl},update:{enabled:true,webhookUrl:body.webhookUrl}});return NextResponse.json({ok:true,integration:{provider:integration.provider,enabled:true}})}

export async function DELETE(request:Request){
  const user=await getCurrentUser();
  if(!user||!user.members[0])return NextResponse.json({error:"Authentication required"},{status:401});
  const body=await request.json().catch(()=>({}));
  const parsed=z.object({provider:z.enum(["slack","email","webhook","crm","google-calendar","google-gmail","calendly","zapier"])}).safeParse(body);
  if(!parsed.success)return NextResponse.json({error:"Invalid integration provider"},{status:400});
  const organizationId=user.members[0].organizationId;
  const row=await db.integration.findUnique({where:{organizationId_provider:{organizationId,provider:parsed.data.provider}}});
  if(!row)return NextResponse.json({ok:true,disconnected:true});
  if(parsed.data.provider==="slack"&&row.accessToken){try{await fetch("https://slack.com/api/auth.revoke",{method:"POST",headers:{Authorization:`Bearer ${decrypt(row.accessToken)}`}})}catch{}}
  if((parsed.data.provider==="google-calendar"||parsed.data.provider==="google-gmail")&&row.accessToken){try{await fetch("https://oauth2.googleapis.com/revoke",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({token:decrypt(row.accessToken)})})}catch{}}
  await db.integration.delete({where:{organizationId_provider:{organizationId,provider:parsed.data.provider}}});
  return NextResponse.json({ok:true,disconnected:true,provider:parsed.data.provider});
}
