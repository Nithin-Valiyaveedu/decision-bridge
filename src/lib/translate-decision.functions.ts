import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createGeminiProvider } from "./ai-gateway.server";

const InputSchema = z.object({
  question: z.string().min(1).max(1000),
  area: z.string().min(1).max(200),
  technicalFindings: z.array(z.string()).max(10).default([]),
  projectName: z.string().max(200).default(""),
});

const OutputSchema = z.object({
  businessImpact: z.string(),
  timelineRisk: z.string(),
  financialSignal: z.string(),
  recommendedAction: z.string(),
  stakeholders: z.array(z.string()),
});

export type TranslationResult = z.infer<typeof OutputSchema>;

function extractJson(raw: string): unknown {
  let s = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = s.search(/[\{\[]/);
  const end = s.lastIndexOf(s[start] === "[" ? "]" : "}");
  if (start === -1 || end === -1) throw new Error("No JSON");
  s = s.substring(start, end + 1);
  try { return JSON.parse(s); } catch {
    return JSON.parse(s.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, ""));
  }
}

export const translateDecision = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");

    const gemini = createGeminiProvider(key);
    const model = gemini("gemini-2.0-flash");

    const findingsText = data.technicalFindings.length
      ? data.technicalFindings.map((f, i) => `${i + 1}. ${f}`).join("\n")
      : "No specific technical findings captured yet — assess based on the decision area.";

    const { text } = await generateText({
      model,
      messages: [
        {
          role: "system",
          content: `You translate technical engineering findings into clear, concise business language for non-technical decision makers.
Be specific. Quantify impact with realistic estimates where possible. Focus on outcomes: time, money, risk, opportunity.
Never use technical jargon. Respond only with the requested JSON object.`,
        },
        {
          role: "user",
          content: `Decision question: "${data.question}"
Area: ${data.area}
Project: ${data.projectName || "Engineering project"}

Technical findings from the expert knowledge base:
${findingsText}

Return ONLY this JSON (no prose, no markdown fences):
{
  "businessImpact": "2-3 sentence plain-language summary of what this means for the business outcome and why it matters now",
  "timelineRisk": "specific timeline implication e.g. '4–6 week delay if qualification is not complete before launch date'",
  "financialSignal": "estimated financial impact e.g. '~€120k tooling savings if approved' or '€40k/day line downtime cost if unresolved'",
  "recommendedAction": "single most important action the decision maker should take right now (1 clear sentence)",
  "stakeholders": ["2-3 roles or functions who should be informed of this decision e.g. 'VP Operations', 'Customer Account Manager'"]
}`,
        },
      ],
    });

    try {
      const parsed = extractJson(text);
      const result = OutputSchema.safeParse(parsed);
      if (result.success) return result.data;
      const obj = (parsed ?? {}) as Record<string, unknown>;
      return {
        businessImpact: String(obj.businessImpact ?? "Business impact assessment in progress."),
        timelineRisk: String(obj.timelineRisk ?? "Timeline impact not yet quantified."),
        financialSignal: String(obj.financialSignal ?? "Financial signal requires expert input."),
        recommendedAction: String(obj.recommendedAction ?? "Gather expert input before proceeding."),
        stakeholders: Array.isArray(obj.stakeholders) ? obj.stakeholders.map(String) : [],
      };
    } catch {
      return {
        businessImpact: text.slice(0, 400) || "Translation could not be completed.",
        timelineRisk: "Timeline not estimated.",
        financialSignal: "Financial signal not estimated.",
        recommendedAction: "Route to relevant experts for structured input.",
        stakeholders: [],
      };
    }
  });
