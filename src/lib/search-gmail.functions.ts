import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type GmailMessage = {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  body: string;
};

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function extractBody(payload: Record<string, unknown>): string {
  // Direct body
  const body = payload.body as { data?: string } | undefined;
  if (body?.data) return decodeBase64Url(body.data);

  // Multipart: recurse through parts
  const parts = payload.parts as Record<string, unknown>[] | undefined;
  if (parts) {
    for (const part of parts) {
      const mime = part.mimeType as string;
      if (mime === "text/plain") {
        const pb = part.body as { data?: string } | undefined;
        if (pb?.data) return decodeBase64Url(pb.data);
      }
      // nested multipart
      if (mime?.startsWith("multipart/")) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
    // fallback: first part with body data
    for (const part of parts) {
      const pb = part.body as { data?: string } | undefined;
      if (pb?.data) return decodeBase64Url(pb.data);
    }
  }
  return "";
}

export const searchGmail = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string(),
      query: z.string(),
      maxResults: z.number().int().min(1).max(10).default(5),
    }),
  )
  .handler(async ({ data }): Promise<GmailMessage[]> => {
    const token = data.token || process.env.GMAIL_ACCESS_TOKEN || "";
    if (!token) {
      throw new Error("No Gmail token — connect Gmail in the Connections tab first.");
    }

    const headers = { Authorization: `Bearer ${token}` };

    // 1. Search
    const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(data.query)}&maxResults=${data.maxResults}`;
    const searchRes = await fetch(searchUrl, { headers });
    if (searchRes.status === 401) throw new Error("Gmail token expired — reconnect Gmail in the Connections tab.");
    if (!searchRes.ok) throw new Error(`Gmail search failed: ${searchRes.status}`);

    const searchJson = (await searchRes.json()) as { messages?: { id: string }[] };
    const ids = (searchJson.messages ?? []).slice(0, data.maxResults);
    if (ids.length === 0) return [];

    // 2. Fetch each message
    const messages = await Promise.all(
      ids.map(async ({ id }) => {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
          { headers },
        );
        if (!msgRes.ok) return null;
        const msg = (await msgRes.json()) as {
          id: string;
          snippet?: string;
          payload?: Record<string, unknown>;
        };

        const hdrs = (msg.payload?.headers as { name: string; value: string }[]) ?? [];
        const header = (n: string) => hdrs.find((h) => h.name === n)?.value ?? "";

        const rawDate = header("Date");
        let date = rawDate;
        try {
          date = new Date(rawDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
        } catch { /* keep raw */ }

        const body = msg.payload ? extractBody(msg.payload) : (msg.snippet ?? "");

        return {
          id: msg.id,
          subject: header("Subject") || "(no subject)",
          from: header("From"),
          date,
          snippet: msg.snippet ?? "",
          body: body || (msg.snippet ?? ""),
        } satisfies GmailMessage;
      }),
    );

    return messages.filter((m): m is GmailMessage => m !== null);
  });

// Build a smart search query from area + expert email
export function buildGmailQuery(area: string, expertEmail: string): string {
  const areaKeywords: Record<string, string> = {
    "Supplier approval": "supplier approval qualification",
    "Manufacturing defect": "defect manufacturing line quality",
    "Pilot batch shipment": "pilot batch shipment quality gate",
    "Material change": "material change packaging compliance",
    "New testing process": "testing process validation qualification",
  };
  const keywords = areaKeywords[area] ?? area.toLowerCase();
  return `(from:${expertEmail} OR to:${expertEmail}) (${keywords})`;
}
