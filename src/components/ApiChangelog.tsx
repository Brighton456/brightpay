import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Plus, Zap, AlertTriangle, Wrench, BookOpen } from "lucide-react";

interface ChangelogEntry {
  version: string;
  date: string;
  type: "feature" | "breaking" | "fix" | "docs";
  changes: string[];
}

const entries: ChangelogEntry[] = [
  { version: "v2.4.0", date: "Aug 21, 2026", type: "feature", changes: ["Added payment link generation endpoint", "New bulk payment API supporting up to 1000 recipients", "Webhook retry mechanism with exponential backoff", "Added webhook payload signature verification"] },
  { version: "v2.3.1", date: "Aug 10, 2026", type: "fix", changes: ["Fixed duplicate webhook delivery on timeout", "Corrected timezone handling in transaction timestamps", "Improved error messages for invalid phone formats"] },
  { version: "v2.3.0", date: "Jul 28, 2026", type: "feature", changes: ["Introduced transaction filtering by date range", "Added CSV export for transaction history", "New API key rotation endpoint"] },
  { version: "v2.2.0", date: "Jul 15, 2026", type: "breaking", changes: ["Deprecated v1 payment endpoints (sunset: Jan 2027)", "Changed response format: `status` field is now a string enum", "Minimum amount increased from KES 1 to KES 5"] },
  { version: "v2.1.0", date: "Jun 30, 2026", type: "feature", changes: ["OAuth 2.0 authentication support", "New account balance endpoint", "Added rate limit headers to all responses"] },
  { version: "v2.0.0", date: "Jun 1, 2026", type: "breaking", changes: ["Complete API redesign — new URL structure", "Authentication moved to Bearer tokens", "Response format standardized across all endpoints"] },
];

const typeConfig = { feature: { icon: Zap, color: "text-green-500", badge: "bg-green-500/10 text-green-500" }, breaking: { icon: AlertTriangle, color: "text-red-500", badge: "bg-red-500/10 text-red-500" }, fix: { icon: Wrench, color: "text-blue-500", badge: "bg-blue-500/10 text-blue-500" }, docs: { icon: BookOpen, color: "text-purple-500", badge: "bg-purple-500/10 text-purple-500" } };

export default function ApiChangelog() {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? entries : entries.slice(0, 3);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4" /> API Changelog</CardTitle>
        <Badge variant="outline" className="text-xs">Latest: {entries[0].version}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {visible.map((entry) => {
          const tc = typeConfig[entry.type];
          return (
            <div key={entry.version} className="relative pl-6 border-l-2 border-muted last:border-transparent">
              <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-card border-2 ${tc.color} border-current`} />
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={`text-xs ${tc.badge}`}>{entry.version}</Badge>
                <span className="text-xs text-muted-foreground">{entry.date}</span>
              </div>
              <ul className="space-y-1">
                {entry.changes.map((c, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show Less" : `View Full Changelog (${entries.length} releases)`}
        </Button>
      </CardContent>
    </Card>
  );
}
