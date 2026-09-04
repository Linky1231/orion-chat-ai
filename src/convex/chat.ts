"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

const ORION_SYSTEM =
  "Eres Orión, un asistente de IA inteligente, amigable y servicial. Respondes en español por defecto pero puedes usar cualquier idioma si el usuario lo pide. Eres conciso pero completo, y tienes personalidad. Tu nombre es Orión.";

const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

/**
 * Server action that calls the NVIDIA NIM API (OpenAI-compatible) and returns
 * the response. Runs in Node.js on Convex servers so the API key never reaches
 * the browser.
 *
 * Requires the NVIDIA_API_KEY environment variable (set it in the project's
 * API Keys tab). The model can be overridden with ORION_NVIDIA_MODEL.
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
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Falta la clave de NVIDIA (NVIDIA_API_KEY). Pégala en la pestaña API Keys del proyecto.",
      );
    }

    const model = process.env.ORION_NVIDIA_MODEL ?? "meta/llama-3.3-70b-instruct";

    const apiMessages = [
      { role: "system", content: ORION_SYSTEM },
      ...args.messages,
    ];

    const res = await fetch(NVIDIA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 1024,
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`NVIDIA API error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    return { content, model };
  },
});
