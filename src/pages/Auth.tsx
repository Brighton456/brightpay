import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Mail, Lock, User, Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(
    searchParams.get("mode") === "register" ? "register" : "login"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showVerifyMessage, setShowVerifyMessage] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, phone: phone ? `+254${phone}` : "" },
            emailRedirectTo: window.location.origin + "/dashboard",
          },
        });
        if (error) throw error;
        setShowVerifyMessage(true);
        toast({
          title: "🎉 Account Created!",
          description: "Please check your email to verify your account before signing in.",
        });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!", description: "Redirecting to your dashboard..." });
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (showVerifyMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
            <Mail className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Check Your Email! 📬</h2>
          <p className="text-muted-foreground mb-2">
            We've sent a verification link to <strong className="text-foreground">{email}</strong>
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Click the link in your email to verify your account and start your BrightPay journey. 
            Check your spam folder if you don't see it.
          </p>
          <div className="p-4 rounded-xl bg-muted/50 mb-6 text-left">
            <h3 className="font-semibold text-foreground text-sm mb-2">What happens next?</h3>
            <div className="space-y-2">
              {["Verify your email ✉️", "Complete KYC to create endpoints 📋", "Start accepting payments! 🚀"].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
                  <span className="text-sm text-foreground">{step}</span>
                </div>
              ))}
            </div>
          </div>
          <Button variant="outline" onClick={() => { setShowVerifyMessage(false); setMode("login"); }}>
            Back to Sign In
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">BrightPay</span>
          </Link>

          <h1 className="text-2xl font-bold text-foreground mb-1">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {mode === "login" ? "Sign in to manage your payments" : "Start accepting M-Pesa payments in minutes"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-foreground">Full Name</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="name" placeholder="John Kamau" className="pl-10" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {mode === "register" && (
              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-foreground">Phone Number</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+254</span>
                  <Input id="phone" placeholder="798765432" className="pl-14" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground btn-press h-11">
              {loading ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : (
                <>{mode === "login" ? "Sign In" : "Create Account"}<ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-6">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-primary font-semibold hover:underline">
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </motion.div>
      </div>
      <div className="hidden lg:flex flex-1 gradient-hero items-center justify-center p-12">
        <div className="max-w-md">
          <h2 className="text-3xl font-extrabold text-secondary-foreground mb-6">Join 500+ businesses processing payments with BrightPay</h2>
          <div className="space-y-4">
            {["Instant M-Pesa STK Push integration", "Real-time transaction analytics", "Multi-endpoint payment routing", "Secure API with 99.9% uptime"].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"><Check className="w-3.5 h-3.5 text-primary" /></div>
                <span className="text-secondary-foreground/80 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
