import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Archive, RotateCcw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ArchiveControls() {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchSnaps = async () => {
    const { data } = await supabase.from("archive_snapshots" as any).select("*").order("archived_at", { ascending: false });
    setSnapshots((data as any[]) || []);
  };
  useEffect(() => { fetchSnaps(); }, []);

  const archive = async () => {
    if (confirmText !== "ARCHIVE") return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc("admin_archive_all" as any, { p_note: note || null });
      if (error) throw error;
      toast({ title: "Archived", description: "All balances and transactions reset to zero." });
      setConfirmOpen(false); setConfirmText(""); setNote("");
      fetchSnaps();
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const restore = async (id: string) => {
    if (!confirm("Restore this snapshot? Balances and transactions will be added back.")) return;
    try {
      const { error } = await supabase.rpc("admin_unarchive" as any, { p_snapshot_id: id });
      if (error) throw error;
      toast({ title: "Restored", description: "Snapshot restored." });
      fetchSnaps();
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2"><Archive className="w-5 h-5" /> Archive & Reset</h2>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Full Financial Reset</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs">Archives ALL transactions, zeros every user wallet and admin profit wallet, and zeros all admin reports. Restore any time from the list below — restored balances are <strong>added</strong> to whatever has accumulated since.</p>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}><Archive className="w-4 h-4 mr-2" /> Archive & Reset Everything</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Past Snapshots</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {snapshots.length === 0 && <p className="text-xs text-muted-foreground">No snapshots yet.</p>}
          {snapshots.map(s => (
            <div key={s.id} className="flex items-center justify-between p-2 rounded border">
              <div>
                <p className="text-xs font-semibold">{new Date(s.archived_at).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{s.tx_count} transactions · {s.note || "no note"}</p>
                {s.restored_at && <p className="text-[10px] text-emerald-600">Restored {new Date(s.restored_at).toLocaleString()}</p>}
              </div>
              {!s.restored_at && <Button size="sm" variant="outline" onClick={() => restore(s.id)}><RotateCcw className="w-3 h-3 mr-1" /> Restore</Button>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Full Reset</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">Type <code className="bg-muted px-1.5 py-0.5 rounded">ARCHIVE</code> to confirm.</p>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="ARCHIVE" />
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional, helps identify this snapshot later)" rows={2} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" disabled={confirmText !== "ARCHIVE" || loading} onClick={archive}>{loading ? "Archiving..." : "Archive Now"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
