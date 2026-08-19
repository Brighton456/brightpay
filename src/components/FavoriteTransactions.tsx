import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Trash2 } from "lucide-react";
const KEY = "bp-favorites";
export default function FavoriteTransactions() {
  const [favs, setFavs] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } });
  const save = (f: any[]) => { setFavs(f); localStorage.setItem(KEY, JSON.stringify(f)); };
  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Star className="w-5 h-5 text-amber-500" /> Favorites</CardTitle></CardHeader>
      <CardContent>
        {favs.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No favorites yet. Star transactions to save them here.</p> : (
          <div className="space-y-2">{favs.map((f, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
              <div><p className="font-semibold text-foreground">{f.ref || "Favorite"}</p><p className="text-muted-foreground">KES {Number(f.amount).toLocaleString()}</p></div>
              <button onClick={() => save(favs.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}</div>
        )}
      </CardContent>
    </Card>
  );
}
