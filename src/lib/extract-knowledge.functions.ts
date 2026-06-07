import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const InputSchema = z.object({
  knowledgeArea: z.string().min(1).max(200),
  expertName: z.string().min(1).max(200),
  transcript: z.string().max(50000).optional().default(""),
  additionalInsights: z.string().max(10000).optional().default(""),
  imageBase64: z.string().max(8_000_000).optional(),
  imageMimeType: z.string().max(100).optional(),
});

const OutputSchema = z.object({
  summary: z.string().describe("Concise expert knowledge summary (2-5 sentences) suitable for a knowledge base entry."),
  keyPoints: z.array(z.string()).min(1).max(8).describe("Bullet-style key findings or decisions."),
  recommendedConfidence: z.enum(["High confidence", "Medium confidence", "Low confidence"]),
  sourceLabel: z.string().describe("Short label describing the source, e.g. 'Meeting transcript - 2026-06' or 'Handwritten notes'."),
});

export const extractKnowledge = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    if (!data.transcript.trim() && !data.imageBase64 && !data.additionalInsights.trim()) {
      throw new Error("Provide a transcript, an image, or additional insights.");
    }

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const userParts: Array<
      | { type: "text"; text: string }
      | { type: "image"; image: string; mediaType?: string }
    > = [];

    let userText = `You are helping a technical expert (${data.expertName}) capture knowledge in the area: "${data.knowledgeArea}".\n\nProduce a structured knowledge entry suitable for a project decision knowledge base.`;
    if (data.transcript.trim()) {
      userText += `\n\n--- Meeting transcript ---\n${data.transcript.trim()}`;
    }
    if (data.additionalInsights.trim()) {
      userText += `\n\n--- Expert's additional insights ---\n${data.additionalInsights.trim()}`;
    }
    if (data.imageBase64) {
      userText += `\n\nAn image of handwritten meeting notes is also attached. Extract any relevant content from it.`;
    }
    userParts.push({ type: "text", text: userText });

    if (data.imageBase64) {
      const mediaType = data.imageMimeType || "image/png";
      userParts.push({
        type: "image",
        image: `data:${mediaType};base64,${data.imageBase64}`,
        mediaType,
      });
    }

    const { object } = await generateObject({
      model,
      schema: OutputSchema,
      messages: [
        {
          role: "system",
          content:
            "You extract concise, decision-grade engineering knowledge from meeting transcripts, handwritten notes, and expert input. Be specific, neutral, and avoid speculation.",
        },
        { role: "user", content: userParts },
      ],
    });

    return object;
  });
