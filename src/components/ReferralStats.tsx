import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Users, TrendingUp } from "lucide-react";
export default function ReferralStats({ profile }: { profile: any }) {
  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Gift className="w-5 h-5 text-amber-500" /> Referral Stats</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 text-center"><Users className="w-4 h-4 text-primary mx-auto mb-1" /><p className="text-sm font-black">0</p><p className="text-[9px] text-muted-foreground">Referrals</p></div>
          <div className="p-2 rounded-lg bg-emerald/5 border border-emerald/20 text-center"><TrendingUp className="w-4 h-4 text-emerald mx-auto mb-1" /><p className="text-sm font-black">KES 0</p><p className="text-[9px] text-muted-foreground">Earned</p></div>
          <div className="p-2 rounded-lg bg-amber/5 border border-amber/20 text-center"><Gift className="w-4 h-4 text-amber mx-auto mb-1" /><p className="text-sm font-black">0.5%</p><p className="text-[9px] text-muted-foreground">Rate</p></div>
        </div>
      </CardContent>
    </Card>
  );
}
