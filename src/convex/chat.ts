"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

const ORION_SYSTEM =
  "Eres Orión, un asistente de IA inteligente, amigable y servicial. Respondes en español por defecto pero puedes usar cualquier idioma si el usuario lo pide. Eres conciso pero completo, y tienes personalidad. Tu nombre es Orión.";

const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODELS_URL = "https://integrate.api.nvidia.com/v1/models";

/**
 * Returns the first model listed by NVIDIA that Orion can fall back to if the
 * user's preferred model is gone (EOL). Always runs server-side.
 */
async function pickFallbackModel(apiKey: string): Promise<string> {
  const res = await fetch(NVIDIA_MODELS_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    return "meta/llama-3.1-8b-instruct"; // safe-ish static fallback
  }

  const data = await res.json();
  if (!Array.isArray(data.data)) {
    return "meta/llama-3.1-8b-instruct";
  }

  // Prefer something chat-friendly that looks current (anything but a known
  // meta/llama-3.3* or maverick that we know cycles out). Order is
  // best-effort: we just take the first usable entry.
  for (const model of data.data) {
    const id =
      typeof model === "string" ? model : (model.id || model.name || "");
    if (
      typeof id === "string" &&
      id.includes("llama") &&
      !id.includes("3.3") &&
      !id.includes("maverick")
    ) {
      return id;
    }
  }

  // If nothing chat-friendly shows up, fall back to the first listed model.
  const first = data.data[0];
  return typeof first === "string" ? first : (first?.id || first?.name || "meta/llama-3.1-8b-instruct");
}

/**
 * Server action that calls the NVIDIA NIM API (OpenAI-compatible) and returns
 * the response. Runs in Node.js on Convex servers so the API key never reaches
 * the browser.
 *
 * Requires the NVIDIA_API_KEY environment variable (set it in the project's
 * API Keys tab). You can pin a specific model with ORION_NVIDIA_MODEL in the
 * API Keys tab; if that model is gone, Orion falls back to an available one.
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

    let model = process.env.ORION_NVIDIA_MODEL ?? "meta/llama-3.1-8b-instruct";

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

      // If the model we asked for is gone, try the next available one once.
      if (res.status === 410) {
        const fallback = await pickFallbackModel(apiKey);
        const retry = await fetch(NVIDIA_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: fallback,
            messages: apiMessages,
            temperature: 0.7,
            max_tokens: 1024,
            stream: false,
          }),
        });

        if (!retry.ok) {
          const retryText = await retry.text();
          throw new Error(
            `NVIDIA API error (model ${model}, fallback ${fallback}): ${retry.status} - ${retryText}`,
          );
        }

        const retryData = await retry.json();
        const content = retryData.choices?.[0]?.message?.content || "";
        return { content, model: fallback };
      }

      throw new Error(`NVIDIA API error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    return { content, model };
  },
});
