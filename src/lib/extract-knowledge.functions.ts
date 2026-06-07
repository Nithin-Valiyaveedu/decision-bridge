import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
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
  summary: z.string(),
  keyPoints: z.array(z.string()).min(1).max(8),
  recommendedConfidence: z.enum(["High confidence", "Medium confidence", "Low confidence"]),
  sourceLabel: z.string(),
});

function extractJson(raw: string): unknown {
  let s = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = s.search(/[\{\[]/);
  const end = s.lastIndexOf(s[start] === "[" ? "]" : "}");
  if (start === -1 || end === -1) throw new Error("No JSON in model response");
  s = s.substring(start, end + 1);
  try {
    return JSON.parse(s);
  } catch {
    s = s.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, "");
    return JSON.parse(s);
  }
}

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

    let userText = `You are helping a technical expert (${data.expertName}) capture knowledge in the area: "${data.knowledgeArea}".

Return ONLY a JSON object with this exact shape (no prose, no markdown fences):
{
  "summary": "2-5 sentence concise expert knowledge summary",
  "keyPoints": ["bullet 1", "bullet 2"],
  "recommendedConfidence": "High confidence" | "Medium confidence" | "Low confidence",
  "sourceLabel": "short label e.g. 'Meeting transcript' or 'Handwritten notes'"
}`;
    if (data.transcript.trim()) userText += `\n\n--- Meeting transcript ---\n${data.transcript.trim()}`;
    if (data.additionalInsights.trim()) userText += `\n\n--- Expert's additional insights ---\n${data.additionalInsights.trim()}`;
    if (data.imageBase64) userText += `\n\nAn image of handwritten meeting notes is also attached. Extract any relevant content from it.`;
    userParts.push({ type: "text", text: userText });

    if (data.imageBase64) {
      const mediaType = data.imageMimeType || "image/png";
      userParts.push({
        type: "image",
        image: `data:${mediaType};base64,${data.imageBase64}`,
        mediaType,
      });
    }

    const { text } = await generateText({
      model,
      messages: [
        {
          role: "system",
          content:
            "You extract concise, decision-grade engineering knowledge from meeting transcripts, handwritten notes, and expert input. Always respond with a single JSON object matching the requested shape. Be specific, neutral, and avoid speculation.",
        },
        { role: "user", content: userParts },
      ],
    });

    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch {
      // Final fallback: build a minimal valid object from the raw text
      parsed = {
        summary: text.slice(0, 500) || "No content extracted.",
        keyPoints: ["Model did not return structured output; review raw text."],
        recommendedConfidence: "Low confidence",
        sourceLabel: data.transcript ? "Meeting transcript" : data.imageBase64 ? "Handwritten notes" : "Expert input",
      };
    }

    const result = OutputSchema.safeParse(parsed);
    if (result.success) return result.data;

    // Coerce missing fields rather than failing the user
    const obj = (parsed ?? {}) as Record<string, unknown>;
    return {
      summary: typeof obj.summary === "string" ? obj.summary : String(obj.summary ?? "").slice(0, 1000) || "No summary.",
      keyPoints: Array.isArray(obj.keyPoints) && obj.keyPoints.length ? obj.keyPoints.map(String).slice(0, 8) : ["No key points extracted."],
      recommendedConfidence:
        obj.recommendedConfidence === "High confidence" || obj.recommendedConfidence === "Medium confidence" || obj.recommendedConfidence === "Low confidence"
          ? obj.recommendedConfidence
          : "Medium confidence",
      sourceLabel: typeof obj.sourceLabel === "string" ? obj.sourceLabel : "Expert input",
    };
  });
