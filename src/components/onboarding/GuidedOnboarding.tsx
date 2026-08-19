import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Wallet,
  Link2,
  ShieldCheck,
  Key,
  CreditCard,
  X,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface GuidedOnboardingProps {
  fullName?: string;
  accountStatus?: "idle" | "beginner" | "active";
  createdAt?: string;
}

const STORAGE_KEY = "brightpay-guided-tour-complete-v1";

interface TourStep {
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
  cta: string;
  link?: string;
  linkLabel?: string;
  gradient: string;
}

export default function GuidedOnboarding({
  fullName,
  accountStatus = "idle",
  createdAt,
}: GuidedOnboardingProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const completed = window.localStorage.getItem(STORAGE_KEY);
    if (completed) return;

    if (createdAt) {
      const created = new Date(createdAt);
      const now = new Date();
      const daysSinceCreation =
        (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 7) {
        window.localStorage.setItem(STORAGE_KEY, "true");
        return;
      }
    }

    setOpen(true);
  }, [createdAt]);

  const steps: TourStep[] = useMemo(() => {
    const firstName = fullName?.split(" ")[0] || "there";
    return [
      {
        eyebrow: "Welcome to BrightPay",
        title: `Great to have you here, ${firstName}`,
        description:
          "BrightPay gives you a hosted payments backend, wallet tracking, analytics, and endpoint tools in one workspace. This quick tour shows you the fastest path to your first successful collection.",
        icon: Sparkles,
        cta: "Let's go",
        gradient: "from-primary to-primary/80",
      },
      {
        eyebrow: "Step 1 of 4",
        title: "Complete your KYC verification",
        description:
          "Verify your identity to unlock higher transaction limits, endpoint creation, and full platform features. This takes just a few minutes.",
        icon: ShieldCheck,
        cta: "Start KYC",
        link: "/dashboard?tab=kyc",
        linkLabel: "Go to verification",
        gradient: "from-blue-500 to-blue-600",
      },
      {
        eyebrow: "Step 2 of 4",
        title: "Fund your service wallet",
        description:
          "Your service wallet covers transaction fees, while your income wallet holds collected funds. Top up via M-Pesa to activate deposits, withdrawals, and endpoint collections.",
        icon: Wallet,
        cta: "Fund Wallet",
        link: "/dashboard?tab=wallet",
        linkLabel: "Open wallet",
        gradient: "from-emerald-500 to-emerald-600",
      },
      {
        eyebrow: "Step 3 of 4",
        title: "Create your first payment endpoint",
        description:
          accountStatus === "idle"
            ? "Complete KYC first to unlock endpoint creation. Once verified, you can create API keys and payment links."
            : "Enter your website URL and BrightPay generates a clean API key and callback URL. Use these to accept M-Pesa, cards, and mobile money payments.",
        icon: accountStatus === "idle" ? ShieldCheck : Key,
        cta: accountStatus === "idle" ? "Verify First" : "Create Endpoint",
        link: accountStatus === "idle" ? "/dashboard?tab=kyc" : "/dashboard?tab=endpoints",
        linkLabel: "Open endpoints",
        gradient: "from-purple-500 to-purple-600",
      },
      {
        eyebrow: "Step 4 of 4",
        title: "Start accepting payments",
        description:
          "Share your payment link with customers or integrate the API into your app. Every successful payment is tracked in real-time on your dashboard with analytics and notifications.",
        icon: CreditCard,
        cta: "Go to Dashboard",
        link: "/dashboard",
        linkLabel: "View dashboard",
        gradient: "from-amber-500 to-orange-500",
      },
    ];
  }, [accountStatus, fullName]);

  const completeTour = () => {
    window.localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  };

  const nextStep = () => {
    if (step === steps.length - 1) {
      completeTour();
      return;
    }
    setStep((c) => c + 1);
  };

  const handleLinkClick = (link: string) => {
    completeTour();
    navigate(link);
  };

  const current = steps[step];
  const Icon = current.icon;
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-x-4 top-1/2 z-[71] mx-auto w-full max-w-xl -translate-y-1/2 rounded-[2rem] border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Gradient top bar */}
            <div className={`h-1.5 bg-gradient-to-r ${current.gradient}`} />

            <div className="p-6">
              {/* Header */}
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                    {current.eyebrow}
                  </p>
                  <h2 className="text-2xl font-black tracking-tight text-foreground">
                    {current.title}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full"
                  onClick={completeTour}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content card */}
              <div className="mb-5 flex items-center gap-4 rounded-[1.5rem] bg-muted/60 p-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${current.gradient} text-white shadow-lg`}
                >
                  <Icon className="h-7 w-7" />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {current.description}
                </p>
              </div>

              {/* Progress bar */}
              <div className="mb-5 flex gap-2">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                      index <= step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald" />
                  Step {step + 1} of {steps.length}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={completeTour}>
                    Skip for now
                  </Button>
                  {current.link && (
                    <Button
                      variant="ghost"
                      onClick={() => handleLinkClick(current.link!)}
                      className="gap-1.5 text-sm"
                    >
                      {current.linkLabel}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    className={`bg-gradient-to-r ${current.gradient} text-white hover:opacity-90`}
                    onClick={
                      current.link
                        ? () => handleLinkClick(current.link!)
                        : nextStep
                    }
                  >
                    {current.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
