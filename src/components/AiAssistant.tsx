import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brightpay-ai`;
const IDLE_THRESHOLD = 30000; // 30 seconds idle before showing hint
const HINT_DISPLAY_TIME = 8000; // Show hint for 8 seconds then hide

interface AiAssistantProps {
  contextHint?: string;
}

export default function AiAssistant({ contextHint }: AiAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [whatsapp, setWhatsapp] = useState("0100605856");
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const hintTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    supabase.from("platform_settings").select("*").eq("key", "support_whatsapp").then(({ data }) => {
      if (data?.[0]) setWhatsapp(data[0].value);
    });
  }, []);

  // Dynamic hint: only show after user is idle for 30s
  const resetIdleTimer = useCallback(() => {
    if (open || hintDismissed) return;
    setShowHint(false);
    clearTimeout(idleTimer.current);
    clearTimeout(hintTimer.current);
    idleTimer.current = setTimeout(() => {
      if (!open && !hintDismissed) {
        setShowHint(true);
        hintTimer.current = setTimeout(() => setShowHint(false), HINT_DISPLAY_TIME);
      }
    }, IDLE_THRESHOLD);
  }, [open, hintDismissed]);

  useEffect(() => {
    const events = ["mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      clearTimeout(idleTimer.current);
      clearTimeout(hintTimer.current);
    };
  }, [resetIdleTimer]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const formatWhatsApp = (num: string) => {
    let n = num.replace(/\s/g, "");
    if (n.startsWith("0")) n = "254" + n.slice(1);
    if (!n.startsWith("+")) n = "+" + n;
    return n.replace("+", "");
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok || !resp.body) throw new Error("Failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm having trouble connecting right now. Would you like to [chat with our support team on WhatsApp](https://wa.me/" + formatWhatsApp(whatsapp) + ") instead?" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Dynamic hint - only appears after 30s idle */}
      <AnimatePresence>
        {!open && showHint && contextHint && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-50 max-w-[200px] rounded-2xl bg-card border border-primary/20 shadow-lg p-3 cursor-pointer"
            onClick={() => { setOpen(true); setShowHint(false); setHintDismissed(true); }}
          >
            <button className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); setShowHint(false); setHintDismissed(true); }}>
              <X className="w-3 h-3" />
            </button>
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0 animate-pulse" />
              <div>
                <p className="text-xs font-semibold text-foreground">Stuck?</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Tap here if you need help</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => { setOpen(!open); setShowHint(false); setHintDismissed(true); }}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full gradient-primary text-primary-foreground shadow-xl flex items-center justify-center"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] h-[450px] max-h-[calc(100vh-6rem)] rounded-3xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="gradient-primary p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-primary-foreground">BrightPay Assistant</h3>
                <p className="text-[10px] text-primary-foreground/70">AI-powered help</p>
              </div>
              <a
                href={`https://wa.me/${formatWhatsApp(whatsapp)}?text=${encodeURIComponent("Hello BrightPay Support, I need help with")}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2 py-1 text-[10px] font-semibold text-primary-foreground hover:bg-primary-foreground/25 transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> WhatsApp
              </a>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <Sparkles className="w-7 h-7 text-primary mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground mb-1">How can I help?</p>
                  <p className="text-xs text-muted-foreground mb-3">Ask anything about BrightPay</p>
                  <div className="space-y-1.5">
                    {["How do I create an endpoint?", "How do deposits work?", "What packages are available?"].map((q) => (
                      <button key={q} onClick={() => setInput(q)}
                        className="block w-full text-left px-3 py-2 rounded-xl bg-muted/50 hover:bg-primary/5 text-xs text-foreground transition-colors border border-border/50">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${msg.role === "user" ? "gradient-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none [&>p]:mb-1 [&>ul]:mb-1">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-2.5 border-t border-border">
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2">
                <Input placeholder="Ask about BrightPay..." value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 rounded-full h-9 text-sm bg-muted/50 border-0" />
                <Button type="submit" size="icon" disabled={!input.trim() || loading} className="rounded-full w-9 h-9 gradient-primary text-primary-foreground flex-shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
