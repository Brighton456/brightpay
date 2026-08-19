import { useState } from "react";
import { Search, X } from "lucide-react";
export default function TransactionSearchInline({ onSearch }: { onSearch: (q: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="relative flex items-center">
      <Search className="absolute left-2 w-3.5 h-3.5 text-muted-foreground" />
      <input value={val} onChange={(e) => { setVal(e.target.value); onSearch(e.target.value); }} placeholder="Filter transactions..." className="w-full pl-7 pr-6 py-1.5 rounded-lg bg-muted/50 border border-border text-xs outline-none focus:border-primary" />
      {val && <button onClick={() => { setVal(""); onSearch(""); }} className="absolute right-2"><X className="w-3 h-3 text-muted-foreground" /></button>}
    </div>
  );
}
