"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

const ORION_SYSTEM =
  "Eres Orión, un asistente de IA inteligente, amigable y servicial. Respondes en español por defecto pero puedes usar cualquier idioma si el usuario lo pide. Eres conciso pero completo, y tienes personalidad. Tu nombre es Orión.";

const PREXZY_BASE_URL =
  "https://prexzyapis.com/ai/aiwriter-chat";

/**
 * Server action that calls the user-provided chat endpoint and returns only the
 * reply text. Runs on the Convex Node.js server so any API key stays out of the
 * browser.
 *
 * Expected response shape:
 * {
 *   "status": true,
 *   "result": {
 *     "status": true,
 *     "text": [ "respuesta" ],
 *     "is_full_answer": true,
 *     "model": "model"
 *   }
 * }
 *
 * We extract `result.text[0]` when available. If the endpoint returns plain
 * text instead, we fall back to the whole body.
 */
export const chat = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
  },
  handler: async (_ctx, args) => {
    const lastUserMessage =
      args.messages.length > 0
        ? args.messages[args.messages.length - 1].content
        : "";

    const res = await fetch(
      `${PREXZY_BASE_URL}?prompt=${encodeURIComponent(lastUserMessage)}&model=model`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API de Orión error: ${res.status} - ${errText}`);
    }

    const raw = await res.text();
    let content: string;

    try {
      const json = JSON.parse(raw);

      // Try the exact response shape you showed me first, then a few common
      // text-field names as fallbacks. We use a loose type so a non-matching
      // JSON response does not crash the typecheck.
      const textArray =
        (json as { result?: { text?: unknown } } | undefined)?.result?.text ??
        (json as { text?: unknown } | undefined)?.text ??
        (json as { answer?: unknown } | undefined)?.answer ??
        (json as { response?: unknown } | undefined)?.response ?? [];

      if (Array.isArray(textArray) && textArray.length > 0) {
        content = textArray
          .filter((t) => typeof t === "string")
          .join("\n\n");
      } else if (typeof textArray === "string") {
        content = textArray;
      } else {
        content = raw;
      }
    } catch {
      content = raw;
    }

    if (typeof content !== "string") {
      content = String(content);
    }

    return { content };
  },
});
