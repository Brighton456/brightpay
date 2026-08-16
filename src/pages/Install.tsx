import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Download, Smartphone, Check, Zap, Shield, Wifi, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Install() {
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstallPWA, setCanInstallPWA] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallPWA(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    setInstalling(true);

    // Try PWA install prompt first
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        if (result.outcome === "accepted") {
          setInstalled(true);
          setInstalling(false);
          return;
        }
      } catch {}
    }

    // Fallback: download APK from storage
    try {
      const { data } = supabase.storage.from("bright-pay").getPublicUrl("brightpay.apk");
      const a = document.createElement("a");
      a.href = data.publicUrl;
      a.download = "BrightPay.apk";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setInstalled(true);
    } catch {
      window.open(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/bright-pay/brightpay.apk`, "_blank");
    }
    setInstalling(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="gradient-hero min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md">
          <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/30">
            <Zap className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-secondary-foreground tracking-tight mb-3">
            Install BrightPay
          </h1>
          <p className="text-secondary-foreground/70 mb-8">
            Install the BrightPay app on your device for the best experience.
          </p>

          {installed ? (
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-6 py-3 rounded-2xl font-bold text-sm">
              <Check className="w-5 h-5" /> {canInstallPWA ? "App installed!" : "Download started — open the file to install"}
            </motion.div>
          ) : (
            <Button
              onClick={handleInstall}
              disabled={installing}
              size="lg"
              className="gradient-primary text-primary-foreground btn-press text-base px-10 h-14 rounded-2xl shadow-xl shadow-primary/30 text-lg font-bold"
            >
              {installing ? (
                <><Loader2 className="w-6 h-6 mr-3 animate-spin" /> Installing...</>
              ) : (
                <><Smartphone className="w-6 h-6 mr-3" /> Install App</>
              )}
            </Button>
          )}

          <p className="text-xs text-secondary-foreground/50 mt-4">
            {canInstallPWA ? "Installs directly — no app store needed" : "Android 8.0+ • Tap to install"}
          </p>
        </motion.div>
      </div>

      <div className="max-w-md mx-auto px-4 py-10">
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Zap, title: "Fast", desc: "Instant loads" },
            { icon: Shield, title: "Secure", desc: "End-to-end encrypted" },
            { icon: Wifi, title: "Offline", desc: "Works anywhere" },
          ].map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}>
              <div className="text-center p-4 rounded-2xl border border-border bg-card">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xs font-bold text-foreground">{f.title}</h3>
                <p className="text-[10px] text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Link to="/"><Button variant="outline" className="btn-press"><ArrowLeft className="w-4 h-4 mr-2" /> Back to BrightPay</Button></Link>
        </div>
      </div>
    </div>
  );
}
