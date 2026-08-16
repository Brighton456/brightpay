import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, Camera, FileText, CheckCircle2,
  Clock, AlertCircle, ArrowRight, Star, Users, Zap, Crown, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function KYC() {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [kraPin, setKraPin] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [existingDocs, setExistingDocs] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (user) fetchDocs();
  }, [user]);

  const fetchDocs = async () => {
    const { data } = await supabase.from("kyc_documents").select("*").eq("user_id", user!.id);
    setExistingDocs((data as any[]) || []);
  };

  const handleFileChange = (setter: (f: File | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setter(e.target.files[0]);
  };

  const uploadFile = async (file: File, docType: string) => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${docType}.${ext}`;
    const { error } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("kyc-documents").getPublicUrl(path);
    return path;
  };

  const handleSubmit = async () => {
    if (!idFront || !idBack || !kraPin) {
      toast({ title: "Missing Documents", description: "Please upload all required documents.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      // Delete existing docs first
      await supabase.from("kyc_documents").delete().eq("user_id", user!.id);

      const frontPath = await uploadFile(idFront, "id_front");
      const backPath = await uploadFile(idBack, "id_back");
      const kraPath = await uploadFile(kraPin, "kra_pin");

      await supabase.from("kyc_documents").insert([
        { user_id: user!.id, document_type: "id_front", file_url: frontPath, status: "pending" as any },
        { user_id: user!.id, document_type: "id_back", file_url: backPath, status: "pending" as any },
        { user_id: user!.id, document_type: "kra_pin", file_url: kraPath, status: "pending" as any },
      ]);

      await supabase.rpc("submit_kyc" as any, { p_user_id: user!.id });
      await refreshProfile();
      fetchDocs();
      toast({ title: "🎉 KYC Submitted Successfully!", description: "Your documents are under review. Approval typically takes up to 48 hours." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // Show status if already submitted
  if (profile?.kyc_status === "pending" || profile?.kyc_status === "approved" || profile?.kyc_status === "rejected") {
    const isPending = profile.kyc_status === "pending";
    const isApproved = profile.kyc_status === "approved";
    const isRejected = profile.kyc_status === "rejected";

    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto mt-8">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
              isApproved ? "bg-emerald/10" : isRejected ? "bg-destructive/10" : "bg-primary/10 animate-pulse-glow"
            }`}>
              {isApproved ? <CheckCircle2 className="w-12 h-12 text-emerald" /> :
               isRejected ? <XCircle className="w-12 h-12 text-destructive" /> :
               <Clock className="w-12 h-12 text-primary" />}
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {isApproved ? "🎊 KYC Approved!" : isRejected ? "KYC Rejected" : "🎊 KYC Under Review"}
            </h2>
            <p className="text-muted-foreground mb-2">
              {isApproved ? "Congratulations! You've unlocked payment endpoints. You're now a Beginner!" :
               isRejected ? "Your documents were rejected. Please resubmit with clearer photos." :
               "Our team is reviewing your documents now."}
            </p>
            {isPending && <p className="text-sm text-muted-foreground mb-6">⏱️ <strong>Approval typically takes up to 48 hours.</strong></p>}

            <Card className="text-left mb-6">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-foreground text-sm">Your Submissions</h3>
                {existingDocs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3">
                    {doc.status === "approved" ? <CheckCircle2 className="w-4 h-4 text-emerald flex-shrink-0" /> :
                     doc.status === "rejected" ? <XCircle className="w-4 h-4 text-destructive flex-shrink-0" /> :
                     <Clock className="w-4 h-4 text-amber flex-shrink-0" />}
                    <span className="text-sm text-foreground capitalize">{doc.document_type.replace("_", " ")}</span>
                    <span className={`text-xs ml-auto capitalize ${doc.status === "approved" ? "text-emerald" : doc.status === "rejected" ? "text-destructive" : "text-amber"}`}>{doc.status}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {isRejected && (
              <Button className="gradient-primary text-primary-foreground btn-press" onClick={async () => {
                await supabase.rpc("resubmit_kyc" as any, { p_user_id: user!.id });
                await refreshProfile();
              }}>Resubmit Documents</Button>
            )}

            {isApproved && !profile.activation_paid && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 mb-4">
                <p className="text-sm font-semibold text-foreground mb-1">⚡ Unlock Full Access</p>
                <p className="text-xs text-muted-foreground mb-3">Pay a one-time activation fee of KES 1,000 to enable withdrawals and unlimited endpoints.</p>
                <Button size="sm" className="gradient-primary text-primary-foreground btn-press" onClick={() => window.location.href = "/settings"}>Activate Account</Button>
              </div>
            )}

            <div className="p-4 rounded-xl bg-muted/50 mb-6">
              <div className="flex items-center justify-center gap-2 mb-2"><Users className="w-4 h-4 text-primary" /><span className="text-sm font-semibold text-foreground">Join 5,000+ Verified Businesses</span></div>
              <p className="text-xs text-muted-foreground">Verified accounts can collect payments from all their websites!</p>
            </div>

            <Button variant="outline" className="btn-press" onClick={() => window.location.href = "/dashboard"}>Back to Dashboard</Button>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4"><ShieldCheck className="w-8 h-8 text-primary-foreground" /></div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Verify Your Identity</h1>
          <p className="text-muted-foreground">Complete KYC to unlock payment endpoints and start collecting payments.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Zap, label: "Create Endpoints", desc: "Accept payments on any website" },
            { icon: Star, label: "Higher Limits", desc: "Process more transactions" },
            { icon: Crown, label: "Full Access", desc: "Unlock all BrightPay features" },
          ].map((b) => (
            <div key={b.label} className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
              <b.icon className="w-5 h-5 text-primary mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-foreground">{b.label}</p>
              <p className="text-[10px] text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="p-6">
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h3 className="text-lg font-bold text-foreground mb-1">National ID — Front</h3>
                <p className="text-sm text-muted-foreground mb-4">Upload a clear photo showing the front of your National ID card.</p>
                <label className="block border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange(setIdFront)} />
                  {idFront ? (
                    <div className="flex items-center justify-center gap-2 text-emerald"><CheckCircle2 className="w-5 h-5" /><span className="text-sm font-semibold">{idFront.name}</span></div>
                  ) : (
                    <><Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm font-medium text-foreground">Click to upload or drag & drop</p><p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p></>
                  )}
                </label>
                <Button className="w-full mt-4 gradient-primary text-primary-foreground btn-press" onClick={() => idFront && setStep(2)} disabled={!idFront}>Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h3 className="text-lg font-bold text-foreground mb-1">National ID — Back</h3>
                <p className="text-sm text-muted-foreground mb-4">Upload a clear photo showing the back of your National ID card.</p>
                <label className="block border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange(setIdBack)} />
                  {idBack ? (
                    <div className="flex items-center justify-center gap-2 text-emerald"><CheckCircle2 className="w-5 h-5" /><span className="text-sm font-semibold">{idBack.name}</span></div>
                  ) : (
                    <><Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm font-medium text-foreground">Click to upload or drag & drop</p></>
                  )}
                </label>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="btn-press" onClick={() => setStep(1)}>Back</Button>
                  <Button className="flex-1 gradient-primary text-primary-foreground btn-press" onClick={() => idBack && setStep(3)} disabled={!idBack}>Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </motion.div>
            )}
            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h3 className="text-lg font-bold text-foreground mb-1">KRA PIN Certificate</h3>
                <p className="text-sm text-muted-foreground mb-4">Upload a copy of your KRA PIN certificate (PDF or image).</p>
                <label className="block border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange(setKraPin)} />
                  {kraPin ? (
                    <div className="flex items-center justify-center gap-2 text-emerald"><CheckCircle2 className="w-5 h-5" /><span className="text-sm font-semibold">{kraPin.name}</span></div>
                  ) : (
                    <><FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm font-medium text-foreground">Click to upload or drag & drop</p></>
                  )}
                </label>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="btn-press" onClick={() => setStep(2)}>Back</Button>
                  <Button className="flex-1 gradient-primary text-primary-foreground btn-press" onClick={handleSubmit} disabled={!kraPin || uploading}>
                    {uploading ? "Uploading..." : "Submit for Review"} <ShieldCheck className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
