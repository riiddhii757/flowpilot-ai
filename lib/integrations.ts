import { z } from "zod";

export const eventSchema=z.object({type:z.string().min(1),source:z.string().min(1),payload:z.record(z.string(),z.unknown()),receivedAt:z.string().datetime().optional()});
export type IntegrationEvent=z.infer<typeof eventSchema>;
export interface IntegrationAdapter { provider:string; verify(input:Request):Promise<boolean>; normalize(input:Request):Promise<IntegrationEvent>; execute(action:string,payload:Record<string,unknown>):Promise<{ok:boolean;externalId?:string}>; }

export function createWebhookAdapter(secret:string):IntegrationAdapter{return {provider:"webhook",async verify(input){return input.headers.get("x-flowpilot-secret")===secret},async normalize(input){const payload=await input.json();return eventSchema.parse({type:String(payload.type??"webhook.received"),source:"webhook",payload,receivedAt:new Date().toISOString()})},async execute(){return {ok:true,externalId:`sim_${Date.now()}`}}}}
