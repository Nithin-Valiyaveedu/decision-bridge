import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createGeminiProvider } from "./ai-gateway.server";
import { categoryMap } from "./decisionbridge-data";

const InputSchema = z.object({
  question: z.string().min(1).max(2000),
  knowledgeEntries: z.array(
    z.object({
      id: z.string(),
      area: z.string(),
      expert: z.string(),
      text: z.string(),
      confidence: z.string(),
    })
  ).max(50).default([]),
});

const OutputSchema = z.object({
  categoryKey: z.enum(["supplier", "defect", "pilot", "material", "testing"]),
  matchingIds: z.array(z.string()).default([]),
});

export type ClassifyResult = z.infer<typeof OutputSchema>;

const CATEGORY_DESCRIPTIONS: Record<keyof typeof categoryMap, string> = {
  supplier: "Supplier qualification, approval, reliability testing, procurement readiness, vendor risk",
  defect:   "Manufacturing defect investigation, root cause analysis, production line quality issues",
  pilot:    "Pilot batch readiness, quality gate sign-off, shipment approval, customer delivery",
  material: "Material or packaging change, PLM change-control, material qualification, compliance",
  testing:  "New test process validation, measurement systems, coverage analysis, test engineering",
};

function extractJson(raw: string): unknown {
  let s = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = s.search(/[\{\[]/);
  const end = s.lastIndexOf(s[start] === "[" ? "]" : "}");
  if (start === -1 || end === -1) throw new Error("No JSON found");
  s = s.substring(start, end + 1);
  try { return JSON.parse(s); } catch {
    return JSON.parse(s.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, ""));
  }
}

export const classifyQuestion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");

    const gemini = createGeminiProvider(key);
    const model = gemini("gemini-2.5-flash");

    const categoryList = (Object.keys(CATEGORY_DESCRIPTIONS) as (keyof typeof categoryMap)[])
      .map((k) => `  "${k}": ${CATEGORY_DESCRIPTIONS[k]}`)
      .join("\n");

    const knowledgeBlock = data.knowledgeEntries.length > 0
      ? data.knowledgeEntries
          .map((e) => `  [${e.id}] area="${e.area}" expert="${e.expert}"\n  "${e.text.slice(0, 350)}"`)
          .join("\n\n")
      : "  (none)";

    const { text } = await generateText({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a decision routing system for an engineering organisation. " +
            "You classify PM questions to the right decision category and find relevant expert knowledge — " +
            "even when the question uses business language that doesn't match the technical area labels. " +
            "Respond only with JSON.",
        },
        {
          role: "user",
          content: `PM question: "${data.question}"

Decision categories:
${categoryList}

Expert knowledge entries in the knowledge base:
${knowledgeBlock}

Instructions:
1. Choose the single best categoryKey from: supplier, defect, pilot, material, testing.
   Match semantically — e.g. "Is the vendor ready?" maps to supplier even without the word "supplier".
2. List IDs of knowledge entries that are relevant to the question.
   An entry is relevant if it would help answer it — even if the area label differs from the chosen category.
   Return an empty array if no entries are relevant.

Return ONLY valid JSON, nothing else:
{"categoryKey":"supplier","matchingIds":["id1","id2"]}`,
        },
      ],
    });

    try {
      const parsed = extractJson(text);
      const result = OutputSchema.safeParse(parsed);
      if (result.success) return result.data;
      // Partial recovery
      const obj = (parsed ?? {}) as Record<string, unknown>;
      const validKeys = Object.keys(CATEGORY_DESCRIPTIONS);
      const categoryKey = validKeys.includes(String(obj.categoryKey))
        ? (obj.categoryKey as ClassifyResult["categoryKey"])
        : "testing";
      return { categoryKey, matchingIds: Array.isArray(obj.matchingIds) ? obj.matchingIds.map(String) : [] };
    } catch {
      // Hard fallback — keyword matching
      const q = data.question.toLowerCase();
      let categoryKey: ClassifyResult["categoryKey"] = "testing";
      if (q.includes("supplier") || q.includes("vendor")) categoryKey = "supplier";
      else if (q.includes("defect") || q.includes("line 3")) categoryKey = "defect";
      else if (q.includes("ship") || q.includes("pilot batch")) categoryKey = "pilot";
      else if (q.includes("material") || q.includes("packaging")) categoryKey = "material";
      return { categoryKey, matchingIds: [] };
    }
  });
