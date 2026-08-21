import { z } from "zod";

const citationSchema = z.object({ source: z.string(), content: z.string(), score: z.number().min(0).max(1) });

export async function searchKnowledge(query: string) {
  // Production adapter boundary: replace with pgvector similarity search.
  // Keeping retrieval behind this function makes the AI layer provider-independent.
  const results = [{ source: "Refund policy", content: "Refunds above $500 require manager approval.", score: query.toLowerCase().includes("refund") ? 0.94 : 0.42 }];
  return z.array(citationSchema).parse(results);
}
