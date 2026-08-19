import { useState } from "react";
import { StickyNote } from "lucide-react";
const KEY = "bp-tx-notes";
export default function TransactionNotes({ txId }: { txId: string }) {
  const [note, setNote] = useState<string>(() => { try { return JSON.parse(localStorage.getItem(KEY) || "{}")[txId] || ""; } catch { return ""; } });
  const [editing, setEditing] = useState(false);
  const save = (v: string) => { setNote(v); const all = JSON.parse(localStorage.getItem(KEY) || "{}"); all[txId] = v; localStorage.setItem(KEY, JSON.stringify(all)); setEditing(false); };
  if (editing) return (
    <div className="flex gap-1 mt-1">
      <input autoFocus value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(note); if (e.key === "Escape") setEditing(false); }} onBlur={() => save(note)} className="flex-1 text-[10px] bg-muted rounded px-2 py-1 outline-none" placeholder="Add note..." />
    </div>
  );
  return (
    <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary mt-1">
      <StickyNote className="w-2.5 h-2.5" />{note || "Add note"}
    </button>
  );
}
