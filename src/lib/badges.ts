export interface Badge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  earned: boolean;
  earnedAt?: string;
}

export function computeBadges(profile: any, transactions: any[], endpoints: any[]): Badge[] {
  const now = new Date();
  const totalTxs = transactions.length;
  const completedTxs = transactions.filter((t) => t.status === "completed").length;
  const totalDeposits = transactions
    .filter((t) => (t.type === "deposit" || t.type === "endpoint") && t.status === "completed")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalWithdrawals = transactions.filter((t) => t.type === "withdrawal" && t.status === "completed").length;
  const activeEndpoints = endpoints.filter((e) => e.status === "active").length;

  // Streak calculation
  const txDays = new Set(transactions.filter((t) => t.status === "completed").map((t) => t.created_at?.split("T")[0]));
  let streak = 0;
  const d = new Date();
  while (txDays.has(d.toISOString().split("T")[0])) {
    streak++;
    d.setDate(d.getDate() - 1);
  }

  return [
    {
      id: "first-tx",
      title: "First Step",
      description: "Complete your first transaction",
      emoji: "🎯",
      earned: completedTxs >= 1,
    },
    {
      id: "five-txs",
      title: "Getting Started",
      description: "Complete 5 transactions",
      emoji: "🚀",
      earned: completedTxs >= 5,
    },
    {
      id: "fifty-txs",
      title: "Power User",
      description: "Complete 50 transactions",
      emoji: "⚡",
      earned: completedTxs >= 50,
    },
    {
      id: "hundred-txs",
      title: "Century Club",
      description: "Complete 100 transactions",
      emoji: "💯",
      earned: completedTxs >= 100,
    },
    {
      id: "first-endpoint",
      title: "Endpoint Pioneer",
      description: "Create your first endpoint",
      emoji: "🔗",
      earned: endpoints.length >= 1,
    },
    {
      id: "five-endpoints",
      title: "Endpoint Master",
      description: "Create 5 endpoints",
      emoji: "🏗️",
      earned: endpoints.length >= 5,
    },
    {
      id: "10k-deposits",
      title: "KES 10K Club",
      description: "Collect KES 10,000 in deposits",
      emoji: "💰",
      earned: totalDeposits >= 10000,
    },
    {
      id: "100k-deposits",
      title: "Six Figures",
      description: "Collect KES 100,000 in deposits",
      emoji: "🏦",
      earned: totalDeposits >= 100000,
    },
    {
      id: "kyc-verified",
      identity: "verified",
      title: "Verified",
      description: "Complete KYC verification",
      emoji: "🛡️",
      earned: profile?.kyc_status === "approved",
    } as any,
    {
      id: "active-account",
      title: "Active Member",
      description: "Activate your account",
      emoji: "👑",
      earned: profile?.account_status === "active",
    },
    {
      id: "first-withdrawal",
      title: "First Payout",
      description: "Make your first withdrawal",
      emoji: "💸",
      earned: totalWithdrawals >= 1,
    },
    {
      id: "3-day-streak",
      title: "On a Roll",
      description: "3-day transaction streak",
      emoji: "🔥",
      earned: streak >= 3,
    },
  ];
}
