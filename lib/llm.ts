import OpenAI from "openai";
import { createHash } from "node:crypto";
import { ZItinerary, type Itinerary } from "./itinerary-schema";
import { db } from "./db";
import { llmLogs } from "./db/schema";

const PRIMARY_MODEL = "deepseek-ai/deepseek-v3.2";
const FALLBACK_MODEL = "meta/llama-3.3-70b-instruct";

let _client: OpenAI | null = null;

function client(): OpenAI {
  if (_client) return _client;
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("NVIDIA_API_KEY not set");
  _client = new OpenAI({
    apiKey: key,
    baseURL: "https://integrate.api.nvidia.com/v1",
  });
  return _client;
}

const SYSTEM = `You are a travel itinerary parser for Passyn Travels, an Indian travel agency. Convert the agent's raw notes into the provided JSON schema.

Rules:
- Default currency is INR unless explicitly stated otherwise.
- Infer missing dates from context. If a hotel has no check-in date, use the previous day's date.
- NEVER invent prices, PNRs, or flight numbers — leave those fields null if not stated.
- For each hotel, write a 1-2 sentence \`description\` capturing its character (e.g. "beachfront resort with infinity pool", "boutique heritage hotel in old town"). This is used to search stock photography.
- For day-wise activities, if input only lists destinations day-wise, write a 1-2 sentence description for each based on common knowledge of the destination.
- All ISO dates: yyyy-mm-dd. All datetimes: ISO 8601.
- Set \`attachedImageId\` only when an image's filename, caption, or tag clearly maps to a specific hotel/activity/flight; otherwise leave null.

Return ONLY valid JSON conforming to this exact shape:
{
  "client": { "name": string, "email": string|null, "travellers": int },
  "trip":   { "destination": string, "startDate": "yyyy-mm-dd", "endDate": "yyyy-mm-dd", "nights": int },
  "flights": [{ "type": "outbound"|"return"|"internal", "airline": string, "flightNumber": string|null,
                "from": {"city": string, "airport": string, "datetime": iso},
                "to":   {"city": string, "airport": string, "datetime": iso},
                "pnr": string|null, "attachedImageId": string|null }],
  "hotels":  [{ "name": string, "city": string, "checkIn": "yyyy-mm-dd", "checkOut": "yyyy-mm-dd",
                "nights": int, "roomType": string|null, "mealPlan": string|null,
                "description": string, "notes": string|null, "attachedImageId": string|null,
                "fetchedImageUrl": null, "fetchedImageSource": null }],
  "days":    [{ "dayNumber": int, "date": "yyyy-mm-dd", "title": string, "summary": string,
                "activities": [{ "time": string|null, "title": string, "description": string,
                                 "duration": string|null, "attachedImageId": string|null,
                                 "fetchedImageUrl": null, "fetchedImageSource": null }] }],
  "inclusions": [string],
  "exclusions": [string],
  "pricing": { "total": number|null, "perPerson": number|null, "currency": "INR",
               "breakdown": [{"label": string, "amount": number}] } | null,
  "termsAndConditions": [string]
}`;

export type AttachmentHint = {
  imageId: string;
  filename: string;
  agentTag: string | null;
  agentCaption: string | null;
};

export type ParseInput = {
  rawText: string;
  attachments: AttachmentHint[];
  clientHint?: { name?: string; email?: string; travellers?: number };
  tripHint?: { destination?: string; startDate?: string; endDate?: string };
};

function buildUser(input: ParseInput): string {
  const lines: string[] = [];
  lines.push("RAW NOTES:");
  lines.push(input.rawText || "(empty)");
  lines.push("");
  if (input.clientHint) {
    lines.push("AGENT-PROVIDED CLIENT INFO (treat as authoritative):");
    lines.push(JSON.stringify(input.clientHint));
    lines.push("");
  }
  if (input.tripHint) {
    lines.push("AGENT-PROVIDED TRIP INFO (treat as authoritative):");
    lines.push(JSON.stringify(input.tripHint));
    lines.push("");
  }
  if (input.attachments.length) {
    lines.push("ATTACHED IMAGES (use imageId for attachedImageId fields):");
    for (const a of input.attachments) {
      lines.push(
        `- imageId=${a.imageId}  filename=${a.filename}  tag=${a.agentTag ?? ""}  caption=${a.agentCaption ?? ""}`,
      );
    }
  }
  return lines.join("\n");
}

export type ParseResult =
  | { ok: true; itinerary: Itinerary; model: string; latencyMs: number }
  | { ok: false; error: string; model: string; latencyMs: number };

export async function parseItinerary(args: {
  agentId: string;
  itineraryId?: string | null;
  input: ParseInput;
}): Promise<ParseResult> {
  const userPrompt = buildUser(args.input);
  const promptHash = createHash("sha256")
    .update(SYSTEM + "\n" + userPrompt)
    .digest("hex")
    .slice(0, 32);

  let model = PRIMARY_MODEL;
  let attempt = 0;
  let lastError = "";

  for (attempt = 0; attempt < 3; attempt++) {
    const start = Date.now();
    try {
      const messages: Array<{ role: "system" | "user"; content: string }> = [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt },
      ];
      if (lastError && attempt > 0) {
        messages.push({
          role: "user",
          content: `Your previous output failed validation with: ${lastError}\nReturn corrected JSON now.`,
        });
      }

      const completion = await client().chat.completions.create({
        model,
        messages,
        response_format: { type: "json_object" },
        // Slight creative leeway for hotel/activity descriptions while
        // keeping JSON validity high. JSON-mode is robust up to ~0.5; we
        // stay at 0.4 for the descriptive prose.
        temperature: 0.4,
        top_p: 0.95,
        // Roomy enough for ~2-week itineraries (10–14 days × ~3 activities,
        // hotels, flights, T&Cs). Truncation here means a Zod failure.
        max_tokens: 12000,
      });

      const latencyMs = Date.now() - start;
      const raw = completion.choices?.[0]?.message?.content ?? "";

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        lastError = `JSON parse failed: ${(e as Error).message}`;
        await logLLM({
          agentId: args.agentId,
          itineraryId: args.itineraryId ?? null,
          model,
          promptHash,
          latencyMs,
          promptTokens: completion.usage?.prompt_tokens ?? null,
          completionTokens: completion.usage?.completion_tokens ?? null,
          success: false,
          error: lastError,
        });
        continue;
      }

      const z = ZItinerary.safeParse(parsed);
      if (!z.success) {
        lastError = z.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        await logLLM({
          agentId: args.agentId,
          itineraryId: args.itineraryId ?? null,
          model,
          promptHash,
          latencyMs,
          promptTokens: completion.usage?.prompt_tokens ?? null,
          completionTokens: completion.usage?.completion_tokens ?? null,
          success: false,
          error: lastError,
        });
        continue;
      }

      await logLLM({
        agentId: args.agentId,
        itineraryId: args.itineraryId ?? null,
        model,
        promptHash,
        latencyMs,
        promptTokens: completion.usage?.prompt_tokens ?? null,
        completionTokens: completion.usage?.completion_tokens ?? null,
        success: true,
        error: null,
      });
      return { ok: true, itinerary: z.data, model, latencyMs };
    } catch (e) {
      const latencyMs = Date.now() - start;
      const status = (e as { status?: number }).status;
      lastError = (e as Error).message;
      await logLLM({
        agentId: args.agentId,
        itineraryId: args.itineraryId ?? null,
        model,
        promptHash,
        latencyMs,
        promptTokens: null,
        completionTokens: null,
        success: false,
        error: lastError,
      });
      // On 429: backoff once, then try fallback model
      if (status === 429) {
        await new Promise((r) => setTimeout(r, 2000));
        if (model === PRIMARY_MODEL) model = FALLBACK_MODEL;
      } else if (attempt === 0 && model === PRIMARY_MODEL) {
        model = FALLBACK_MODEL;
      } else {
        return { ok: false, error: lastError, model, latencyMs };
      }
    }
  }

  return { ok: false, error: lastError || "Parser failed", model, latencyMs: 0 };
}

async function logLLM(row: {
  agentId: string;
  itineraryId: string | null;
  model: string;
  promptHash: string;
  latencyMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  success: boolean;
  error: string | null;
}) {
  try {
    await db.insert(llmLogs).values(row);
  } catch {
    /* DB log failure must not crash the request */
  }
}
