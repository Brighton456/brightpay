import { CheckCircle2, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/components/layout/DashboardLayout";

const services = [
  "Authentication API", "Payments API", "Webhooks", "STK Push",
  "B2C Payments", "C2B Payments", "Payment Links", "Dashboard",
  "API Developer Portal", "User Management", "Analytics Engine", "Notification System",
];

export default function ServiceStatus() {
  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-2">
        <Activity className="w-7 h-7 text-emerald-500" />
        <h1 className="text-2xl font-bold text-foreground">Service Status</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Real-time status of all our services</p>

      <div className="rounded-2xl p-6 mb-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-10 h-10" />
          <div>
            <h2 className="text-2xl font-bold">All Systems Operational</h2>
            <p className="text-sm opacity-80">Last updated: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">🔧 System Components</h3>
      <div className="grid md:grid-cols-3 gap-3 mb-8">
        {services.map((s) => (
          <Card key={s} className="border-emerald-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground text-sm">{s}</p>
                <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Operational</p>
              </div>
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
            </CardContent>
          </Card>
        ))}
      </div>

      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">🕐 Incident History</h3>
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
          <p className="font-medium text-foreground">No recent incidents</p>
          <p className="text-sm">All systems have been running smoothly.</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
