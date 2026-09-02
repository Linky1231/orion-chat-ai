"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

const ORION_SYSTEM =
  "Eres Orión, un asistente de IA inteligente, amigable y servicial. Respondes en español por defecto pero puedes usar cualquier idioma si el usuario lo pide. Eres conciso pero completo, y tienes personalidad. Tu nombre es Orión.";

/**
 * Server action that calls Pollinations AI and returns the response.
 * Runs in Node.js environment on Convex servers to avoid CORS issues.
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
    const apiMessages = [
      { role: "system", content: ORION_SYSTEM },
      ...args.messages,
    ];

    const pollinationsKey = process.env.POLLINATIONS_API_KEY;

    let res: Response;
    if (pollinationsKey) {
      res = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pollinationsKey}`,
        },
        body: JSON.stringify({
          model: "openai",
          messages: apiMessages,
          stream: false,
        }),
      });
    } else {
      res = await fetch("https://text.pollinations.ai/openai/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai",
          messages: apiMessages,
          stream: false,
        }),
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Pollinations API error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    return { content };
  },
});
