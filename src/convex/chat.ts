"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

const PREXZY_BASE_URL =
  "https://prexzyapis.com/ai/aiwriter-chat";

/**
 * Server action that calls the user-provided chat endpoint and returns the
 * full response text exactly as the API returns it.
 *
 * Runs on the Convex Node.js server so any API key stays out of the browser.
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
      content = JSON.stringify(json, null, 2);
    } catch {
      content = raw;
    }

    if (typeof content !== "string") {
      content = String(content);
    }

    return { content };
  },
});
