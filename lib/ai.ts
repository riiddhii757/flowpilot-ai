import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

const resultSchema = z.object({
  category: z.enum(["support", "sales", "finance", "other"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  summary: z.string(),
  suggestedAction: z.string(),
  requiresApproval: z.boolean(),
});

const fallbackResult = (text: string) =>
  resultSchema.parse({
    category: "support",
    priority: "normal",
    summary: text.slice(0, 120),
    suggestedAction: "Route to the support queue",
    requiresApproval: false,
  });

export async function triageRequest(text: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  // AI is intentionally optional so local development and production
  // deployments remain usable when no AI key is configured.
  if (!apiKey) return fallbackResult(text);

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? "gemini-3-flash-preview",
    contents: `Classify this business request. Return JSON only with category, priority, summary, suggestedAction, requiresApproval. Request: ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, enum: ["support", "sales", "finance", "other"] },
          priority: { type: Type.STRING, enum: ["low", "normal", "high", "urgent"] },
          summary: { type: Type.STRING },
          suggestedAction: { type: Type.STRING },
          requiresApproval: { type: Type.BOOLEAN },
        },
        required: ["category", "priority", "summary", "suggestedAction", "requiresApproval"],
      },
    },
  });

  const output = response.text?.trim();
  if (!output) return fallbackResult(text);

  return resultSchema.parse(JSON.parse(output));
}
