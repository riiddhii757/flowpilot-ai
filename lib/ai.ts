import OpenAI from "openai";
import { z } from "zod";

const resultSchema = z.object({
  category: z.enum(["support", "sales", "finance", "other"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  summary: z.string(),
  suggestedAction: z.string(),
  requiresApproval: z.boolean(),
});

export async function triageRequest(text: string) {
  if (!process.env.OPENAI_API_KEY) {
    return resultSchema.parse({ category: "support", priority: "normal", summary: text.slice(0, 120), suggestedAction: "Route to the support queue", requiresApproval: false });
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
    input: `Classify this business request. Return JSON only with category, priority, summary, suggestedAction, requiresApproval. Request: ${text}`,
  });
  return resultSchema.parse(JSON.parse(response.output_text));
}
