import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const ORION_SYSTEM =
  "Eres Orión, un asistente de IA inteligente, amigable y servicial. Respondes en español por defecto pero puedes usar cualquier idioma si el usuario lo pide. Eres conciso pero completo, y tienes personalidad. Tu nombre es Orión.";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function streamChat(
  messages: Message[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
) {
  try {
    const apiMessages = [
      { role: "system", content: ORION_SYSTEM },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const res = await fetch("https://text.pollinations.ai/openai/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages: apiMessages,
        stream: true,
      }),
    });

    if (!res.ok) {
      onError("Error " + res.status + ": " + res.statusText);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError("No se pudo leer la respuesta.");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          onDone();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) onChunk(delta);
        } catch {
          // skip malformed chunks
        }
      }
    }
    onDone();
  } catch (e) {
    onError(e instanceof Error ? e.message : "Error de conexión");
  }
}

function inlineFormat(text: string): React.ReactNode[] {
  // Split on **bold** and backtick code — use a safe regex with no backticks in pattern
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  const parts = text.split(regex);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.length > 1 && part.charAt(0) === "`" && part.charAt(part.length - 1) === "`") {
      return (
        <code
          key={i}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function renderContent(text: string) {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, pi) => {
    const lines = para.split("\n");
    const isList = lines.every(
      (l) => /^\s*[-*•]\s/.test(l) || /^\s*\d+\.\s/.test(l),
    );
    if (isList) {
      return (
        <ul key={pi} className="my-1 list-disc space-y-0.5 pl-5">
          {lines.map((line, li) => {
            const cleaned = line
              .replace(/^\s*[-*•]\s/, "")
              .replace(/^\s*\d+\.\s/, "");
            return <li key={li}>{inlineFormat(cleaned)}</li>;
          })}
        </ul>
      );
    }
    return (
      <p key={pi} className="my-1">
        {inlineFormat(para)}
      </p>
    );
  });
}

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const ta = inputRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    }
  }, [input]);

  const handleSend = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isStreaming) return;

      const userMsg: Message = { id: generateId(), role: "user", content: trimmed };
      const assistantMsg: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setIsStreaming(true);

      const allMessages = [...messages, userMsg];

      await streamChat(
        allMessages,
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: m.content + chunk }
                : m,
            ),
          );
        },
        () => setIsStreaming(false),
        (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: m.content || "⚠️ " + err }
                : m,
            ),
          );
          setIsStreaming(false);
        },
      );
    },
    [input, isStreaming, messages],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-border/50 bg-card/50 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer size-8 text-muted-foreground"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
              <Sparkles className="size-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight">Orión</h1>
              <p className="text-xs text-muted-foreground">IA sin límites</p>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer size-8 text-muted-foreground"
          onClick={handleReset}
          title="Nueva conversación"
        >
          <RotateCcw className="size-4" />
        </Button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-1 px-4 py-6">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-1 flex-col items-center justify-center py-20 text-center"
            >
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                <Sparkles className="size-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Hola, soy Orión</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Pregúntame lo que quieras. No hay límites, no hay registro — solo
                tú y yo.
              </p>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={
                  "flex " +
                  (msg.role === "user" ? "justify-end" : "justify-start") +
                  " py-2"
                }
              >
                {msg.role === "assistant" && (
                  <div className="mr-2 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                    <Sparkles className="size-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed " +
                    (msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card text-card-foreground rounded-bl-md ring-1 ring-border/50")
                  }
                >
                  {msg.role === "assistant" ? (
                    <div>{renderContent(msg.content)}</div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {msg.role === "assistant" &&
                    msg.content === "" &&
                    isStreaming && (
                      <div className="flex gap-1">
                        <span className="size-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:0ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:150ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:300ms]" />
                      </div>
                    )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border/50 bg-card/30 px-4 py-3 backdrop-blur-md">
        <form
          onSubmit={handleSend}
          className="mx-auto flex max-w-2xl items-end gap-3"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border/60 bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isStreaming}
            className="cursor-pointer size-10 shrink-0 rounded-xl"
          >
            <Send className="size-4" />
          </Button>
        </form>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[10px] text-muted-foreground/50">
          Powered by Pollinations AI · Sin límites · Sin registro
        </p>
      </div>
    </div>
  );
}
