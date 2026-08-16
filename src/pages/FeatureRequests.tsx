import { useState, useEffect } from "react";
import { Lightbulb, Plus, ThumbsUp, Clock, CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function FeatureRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    const { data } = await supabase.from("feature_requests").select("*").order("created_at", { ascending: false });
    setRequests((data as any[]) || []);
  };

  const handleSubmit = async () => {
    if (!title || !desc) return;
    setSubmitting(true);
    await supabase.from("feature_requests").insert({ user_id: user!.id, title, description: desc } as any);
    toast({ title: "🎉 Feature Request Submitted!", description: "Thank you for helping us improve BrightPay!" });
    setShowNew(false); setTitle(""); setDesc(""); fetchRequests();
    setSubmitting(false);
  };

  const statusConfig: Record<string, { icon: any; color: string }> = {
    pending: { icon: Clock, color: "text-amber-500" },
    reviewed: { icon: CheckCircle2, color: "text-primary" },
    implemented: { icon: CheckCircle2, color: "text-emerald-500" },
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Lightbulb className="w-6 h-6 text-amber-500" /> Feature Requests</h1>
          <p className="text-sm text-muted-foreground">Help us build the features you need</p>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground btn-press"><Plus className="w-4 h-4 mr-2" /> New Request</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit Feature Request</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div><label className="text-sm font-medium">Title</label><Input placeholder="e.g. Add bulk payment support" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Description</label><Textarea placeholder="Describe what you'd like to see..." value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1" rows={4} /></div>
              <Button className="w-full gradient-primary text-primary-foreground" onClick={handleSubmit} disabled={submitting || !title || !desc}><Send className="w-4 h-4 mr-2" /> {submitting ? "Submitting..." : "Submit Request"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No feature requests yet. Be the first to suggest one!</CardContent></Card>
        ) : requests.map((r) => {
          const sc = statusConfig[r.status] || statusConfig.pending;
          const Icon = sc.icon;
          return (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0"><Lightbulb className="w-4 h-4 text-amber-500" /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{r.title}</h3>
                      <span className={`flex items-center gap-1 text-xs font-medium ${sc.color} capitalize`}><Icon className="w-3 h-3" />{r.status}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.description}</p>
                    {r.admin_response && <div className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/10 text-sm"><strong className="text-foreground">Admin Response:</strong> <span className="text-muted-foreground">{r.admin_response}</span></div>}
                    <p className="text-xs text-muted-foreground mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground"><ThumbsUp className="w-4 h-4" /><span className="text-xs">{r.votes}</span></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
