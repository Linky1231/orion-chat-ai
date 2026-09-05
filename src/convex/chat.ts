"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

const ORION_SYSTEM =
  "Eres Orión, un asistente de IA inteligente, amigable y servicial. Respondes en español por defecto pero puedes usar cualquier idioma si el usuario lo pide. Eres conciso pero completo, y tienes personalidad. Tu nombre es Orión.";

const PREXZY_BASE_URL =
  "https://prexzyapis.com/ai/aiwriter-chat";

/**
 * Server action that calls the user-provided chat endpoint and returns the
 * response text. Runs on the Convex Node.js server so any API key stays out of
 * the browser.
 *
 * The endpoint is called as a plain GET with the latest user message in the
 * `prompt` query param and `model=model`. If the server returns JSON instead of
 * plain text, the action tries to extract a text field automatically.
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
        headers: { Accept: "text/plain" },
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API de Orión error: ${res.status} - ${errText}`);
    }

    const raw = await res.text();

    // If the endpoint returns JSON instead of plain text, parse it and extract
    // the first useful text field we recognize.
    let content: string;
    try {
      const json = JSON.parse(raw);
      content =
        json.content ??
        json.text ??
        json.answer ??
        json.response ??
        json.message ??
        json.data ??
        json.output ??
        raw;
    } catch {
      content = raw;
    }

    if (typeof content !== "string") {
      content = String(content);
    }

    return { content };
  },
});
