import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
export default function AccountAgeCard({ createdAt }: { createdAt?: string }) {
  if (!createdAt) return null;
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  return (
    <Card className="rounded-2xl border-border/70">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><CalendarDays className="w-4 h-4 text-primary" /></div>
        <div>
          <p className="text-xs font-semibold text-foreground">Member for {days} days</p>
          <p className="text-[10px] text-muted-foreground">Since {new Date(createdAt).toLocaleDateString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}
