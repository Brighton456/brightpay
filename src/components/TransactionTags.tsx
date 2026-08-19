import { useState } from "react";
import { Tag, X, Plus } from "lucide-react";
const KEY = "bp-tx-tags";
export default function TransactionTags({ txId }: { txId: string }) {
  const [tags, setTags] = useState<string[]>(() => { try { const all = JSON.parse(localStorage.getItem(KEY) || "{}"); return all[txId] || []; } catch { return []; } });
  const [input, setInput] = useState("");
  const save = (t: string[]) => { setTags(t); const all = JSON.parse(localStorage.getItem(KEY) || "{}"); all[txId] = t; localStorage.setItem(KEY, JSON.stringify(all)); };
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-semibold">
          <Tag className="w-2.5 h-2.5" />{t}
          <button onClick={() => save(tags.filter((x) => x !== t))}><X className="w-2 h-2" /></button>
        </span>
      ))}
      <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { save([...tags, input.trim()]); setInput(""); } }} placeholder="+ Tag" className="w-12 text-[9px] bg-transparent outline-none text-muted-foreground" />
    </div>
  );
}
