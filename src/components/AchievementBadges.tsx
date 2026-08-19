import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeBadges } from "@/lib/badges";

interface AchievementBadgesProps {
  profile: any;
  transactions: any[];
  endpoints: any[];
}

export default function AchievementBadges({ profile, transactions, endpoints }: AchievementBadgesProps) {
  const badges = useMemo(() => computeBadges(profile, transactions, endpoints), [profile, transactions, endpoints]);
  const earned = badges.filter((b) => b.earned).length;

  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" /> Achievements
          <span className="text-xs font-normal text-muted-foreground ml-auto">{earned}/{badges.length} earned</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {badges.map((badge, i) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`relative p-3 rounded-2xl border text-center transition-all ${
                badge.earned
                  ? "border-primary/30 bg-primary/5 shadow-sm"
                  : "border-border/50 bg-muted/30 opacity-50 grayscale"
              }`}
            >
              <div className="text-2xl mb-1">{badge.emoji}</div>
              <p className="text-[11px] font-bold text-foreground leading-tight">{badge.title}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{badge.description}</p>
              {badge.earned && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald flex items-center justify-center">
                  <span className="text-[8px] text-white">✓</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
