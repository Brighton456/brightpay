import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Compass, Sparkles, Wallet, Link2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GuidedOnboardingProps {
  fullName?: string;
  accountStatus?: "idle" | "beginner" | "active";
  createdAt?: string;
}

const STORAGE_KEY = "brightpay-guided-tour-complete-v1";

export default function GuidedOnboarding({ fullName, accountStatus = "idle", createdAt }: GuidedOnboardingProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const completed = window.localStorage.getItem(STORAGE_KEY);
    if (completed) return;

    // Only show for accounts created within the last 7 days
    if (createdAt) {
      const created = new Date(createdAt);
      const now = new Date();
      const daysSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 7) {
        // Mark as complete for old accounts so it never shows
        window.localStorage.setItem(STORAGE_KEY, "true");
        return;
      }
    }

    setOpen(true);
  }, [createdAt]);

  const steps = useMemo(() => {
    const firstName = fullName?.split(" ")[0] || "there";
    return [
      { eyebrow: "Welcome tour", title: `Great to have you here, ${firstName}`, description: "BrightPay gives you a hosted payments backend, wallet tracking, analytics, and endpoint tools in one workspace. This quick tour shows you the fastest path to your first successful collection.", icon: Sparkles, cta: "Next" },
      { eyebrow: "Wallet flow", title: "Top up your service wallet first", description: "Your service wallet covers transaction costs, while your income wallet holds collected funds. Start with a quick top up so deposits, withdrawals, and endpoint collections can move smoothly.", icon: Wallet, cta: "Next" },
      { eyebrow: "Collection setup", title: accountStatus === "idle" ? "Unlock endpoints through verification" : "Create your first payment endpoint", description: accountStatus === "idle" ? "Finish KYC to unlock endpoint creation and move into the next growth stage." : "Just enter your website link and BrightPay prepares a clean callback destination for you automatically.", icon: accountStatus === "idle" ? ShieldCheck : Link2, cta: "Next" },
      { eyebrow: "Analytics", title: "Track every movement beautifully", description: "Your dashboard highlights balances, collection performance, pending activity, and recent transaction movement so you can spot momentum at a glance.", icon: Compass, cta: "Finish tour" },
    ];
  }, [accountStatus, fullName]);

  const completeTour = () => { window.localStorage.setItem(STORAGE_KEY, "true"); setOpen(false); };
  const nextStep = () => { if (step === steps.length - 1) { completeTour(); return; } setStep((c) => c + 1); };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.22 }} className="fixed inset-x-4 top-1/2 z-[71] mx-auto w-full max-w-xl -translate-y-1/2 rounded-[2rem] border border-border bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">{steps[step].eyebrow}</p>
                <h2 className="text-2xl font-black tracking-tight text-foreground">{steps[step].title}</h2>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={completeTour}><X className="h-4 w-4" /></Button>
            </div>
            <div className="mb-5 flex items-center gap-4 rounded-[1.5rem] bg-muted/60 p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-primary-foreground">
                {(() => { const Icon = steps[step].icon; return <Icon className="h-7 w-7" />; })()}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{steps[step].description}</p>
            </div>
            <div className="mb-5 flex gap-2">
              {steps.map((_, index) => (<div key={index} className={`h-2 flex-1 rounded-full transition-all ${index <= step ? "bg-primary" : "bg-muted"}`} />))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald" /> Step {step + 1} of {steps.length}</div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={completeTour}>Skip for now</Button>
                <Button className="gradient-primary text-primary-foreground" onClick={nextStep}>{steps[step].cta}<ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
