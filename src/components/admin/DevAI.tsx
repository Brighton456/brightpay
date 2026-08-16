import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Bot, Send, Loader2, Mic, MicOff, RotateCcw, ShieldCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };

export default function DevAI() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"concise" | "walkthrough" | "lesson">("walkthrough");
  const [planOnly, setPlanOnly] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next); setInput(""); setLoading(true);
    try {
      const finalMessages = planOnly
        ? [{ role: "system" as const, content: "PLAN MODE: do NOT call propose_action. Only diagnose and explain." }, ...next]
        : next;
      const { data, error } = await supabase.functions.invoke("dev-ai", { body: { messages: finalMessages, mode } });
      if (error) throw error;
      setMessages([...next, { role: "assistant", content: data.content || "(no response)" }]);
    } catch (e: any) {
      setMessages([...next, { role: "assistant", content: `**Error:** ${e.message}` }]);
    } finally { setLoading(false); }
  };

  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return toast({ title: "Voice unsupported", description: "Use Chrome or Edge for voice input.", variant: "destructive" });
    if (listening) { recogRef.current?.stop(); setListening(false); return; }
    const r = new SR(); r.continuous = false; r.interimResults = false; r.lang = "en-US";
    r.onresult = (e: any) => setInput(e.results[0][0].transcript);
    r.onend = () => setListening(false);
    r.start(); recogRef.current = r; setListening(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2"><Bot className="w-5 h-5" /> Developer AI</h2>
        <div className="flex items-center gap-2 text-xs">
          <Select value={mode} onValueChange={(v: any) => setMode(v)}>
            <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="concise">Concise</SelectItem>
              <SelectItem value="walkthrough">Walkthrough</SelectItem>
              <SelectItem value="lesson">Lesson</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5" title="Plan-only mode disables mutating actions">
            <ShieldCheck className="w-3.5 h-3.5" /> Plan
            <Switch checked={planOnly} onCheckedChange={setPlanOnly} />
          </div>
          <Button size="sm" variant="ghost" onClick={() => setMessages([])} title="Clear chat"><RotateCcw className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3">
          <div ref={scrollRef} className="h-[420px] overflow-y-auto space-y-3 pr-1">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <Bot className="w-10 h-10 text-primary mx-auto mb-3" />
                <p className="text-sm font-semibold mb-1">Ask me anything about your platform</p>
                <p className="text-xs text-muted-foreground mb-4">I can read your DB, diagnose errors, suggest fixes, and propose safe actions.</p>
                <div className="grid sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                  {["Show recent failed transactions","Why might M-Pay STK push be failing?","Summarize platform stats","Find users with negative balances"].map(q => (
                    <button key={q} onClick={() => send(q)} className="text-left text-xs p-2 rounded border hover:bg-muted">{q}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.role === "assistant"
                    ? <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-background [&_pre]:p-2 [&_pre]:rounded [&_code]:text-xs"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                    : m.content}
                </div>
              </div>
            ))}
            {loading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Thinking, reading DB...</div>}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
        <Button type="button" size="icon" variant="outline" onClick={toggleVoice} title="Voice input">{listening ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4" />}</Button>
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask in plain English..." disabled={loading} />
        <Button type="submit" disabled={!input.trim() || loading}><Send className="w-4 h-4" /></Button>
      </form>
      <p className="text-[10px] text-muted-foreground">⚠️ Dev AI cannot edit source code or redeploy — use the Lovable editor for that. Mutating actions always require explicit approval and are logged.</p>
    </div>
  );
}
