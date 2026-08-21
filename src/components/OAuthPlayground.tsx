import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Key, Lock, CheckCircle, Copy, ArrowRight } from "lucide-react";

type AuthStep = "credentials" | "authorize" | "token" | "done";

const steps = [
  { id: "credentials" as AuthStep, label: "1. Credentials" },
  { id: "authorize" as AuthStep, label: "2. Authorize" },
  { id: "token" as AuthStep, label: "3. Get Token" },
  { id: "done" as AuthStep, label: "4. Use Token" },
];

export default function OAuthPlayground() {
  const [currentStep, setCurrentStep] = useState<AuthStep>("credentials");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [token, setToken] = useState("");
  const [generating, setGenerating] = useState(false);

  const stepIdx = steps.findIndex((s) => s.id === currentStep);

  const handleNext = () => {
    if (currentStep === "credentials") {
      setCurrentStep("authorize");
    } else if (currentStep === "authorize") {
      setGenerating(true);
      setTimeout(() => {
        setAuthCode("auth_code_" + Math.random().toString(36).slice(2, 10));
        setGenerating(false);
        setCurrentStep("token");
      }, 1000);
    } else if (currentStep === "token") {
      setGenerating(true);
      setTimeout(() => {
        setToken("bpay_" + Math.random().toString(36).slice(2, 18));
        setGenerating(false);
        setCurrentStep("done");
      }, 1000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> OAuth 2.0 Playground</CardTitle>
        <CardDescription>Get an API token using the OAuth flow</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= stepIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {i < stepIdx ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs ${i <= stepIdx ? "text-foreground" : "text-muted-foreground"} hidden sm:inline`}>{s.label}</span>
              {i < steps.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Steps */}
        {currentStep === "credentials" && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Enter your OAuth credentials</h4>
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input placeholder="bpay_client_xxxxxxxxxxxxxxx" value={clientId} onChange={(e) => setClientId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <Input type="password" placeholder="••••••••••••••••" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} />
            </div>
            <Button onClick={handleNext} disabled={!clientId || !clientSecret}>Continue</Button>
          </div>
        )}

        {currentStep === "authorize" && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Authorize your application</h4>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Redirect the user to:</p>
              <code className="text-xs font-mono bg-background p-2 rounded block break-all">
                https://auth.brightpay.co.ke/authorize?client_id={clientId}&response_type=code&redirect_uri=YOUR_REDIRECT_URI&scope=payments:write+transactions:read
              </code>
            </div>
            <div className="space-y-2">
              <Label>Paste the authorization code from the redirect URL</Label>
              <Input placeholder="auth_code_xxxxxxxxxxxxxxx" value={authCode} onChange={(e) => setAuthCode(e.target.value)} />
            </div>
            <Button onClick={handleNext} disabled={!authCode || generating}>
              {generating ? "Generating..." : "Exchange for Token"}
            </Button>
          </div>
        )}

        {currentStep === "token" && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Exchange authorization code for access token</h4>
            <pre className="p-3 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto">
{`curl -X POST https://auth.brightpay.co.ke/token \\
  -d "grant_type=authorization_code" \\
  -d "code=${authCode}" \\
  -d "client_id=${clientId}" \\
  -d "client_secret=••••••••"`}
            </pre>
            <Button onClick={handleNext} disabled={generating}>
              {generating ? "Exchanging..." : "Complete Flow"}
            </Button>
          </div>
        )}

        {currentStep === "done" && (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium text-green-500">Token Generated!</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-background px-2 py-1 rounded flex-1 break-all">{token}</code>
                <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(token)}><Copy className="w-4 h-4" /></Button>
              </div>
            </div>
            <pre className="p-3 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto">
{`curl https://api.brightpay.co.ke/api/v1/payments \\
  -H "Authorization: Bearer ${token}"`}
            </pre>
            <Button variant="outline" onClick={() => { setCurrentStep("credentials"); setToken(""); setAuthCode(""); }}>Reset & Try Again</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
