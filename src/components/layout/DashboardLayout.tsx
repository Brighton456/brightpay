import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AiAssistant from "@/components/AiAssistant";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ArrowLeftRight, Link2, ShieldCheck, FileText,
  Settings, LogOut, Wallet, ChevronLeft, ChevronRight,
  Bell, User, Zap, Crown, Lock, TrendingUp, Menu, X, Shield,
  MessageCircle, Gift, Megaphone, HelpCircle, Smartphone, Heart, DollarSign, Radio, CreditCard, Upload,
  Globe, Activity, Code2, BookOpen, Scale
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactionNotifications } from "@/hooks/use-transaction-notifications";
import QuickPayFAB from "@/components/QuickPayFAB";
import GlobalSearch from "@/components/GlobalSearch";
import NotificationCenter from "@/components/NotificationCenter";

const allNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", minTier: "idle" },
  { icon: ArrowLeftRight, label: "Transactions", path: "/transactions", minTier: "idle" },
  { icon: Wallet, label: "Deposit", path: "/deposit", minTier: "idle" },
  { icon: TrendingUp, label: "Withdraw", path: "/withdraw", minTier: "active" },
  { icon: Link2, label: "Endpoints", path: "/endpoints", minTier: "beginner" },
  { icon: Heart, label: "Fundraiser", path: "/fundraiser", minTier: "beginner" },
  { icon: DollarSign, label: "Lipwa Links", path: "/lipwa", minTier: "beginner" },
  { icon: MessageCircle, label: "Channels", path: "/channels", minTier: "active" },
  { icon: CreditCard, label: "Virtual Cards", path: "/cards", minTier: "active" },
  { icon: Upload, label: "Bulk Pay", path: "/bulk-pay", minTier: "beginner" },

  { icon: ShieldCheck, label: "KYC Verification", path: "/kyc", minTier: "idle" },
  { icon: Crown, label: "Pricing & Tiers", path: "/pricing", minTier: "idle" },
  { icon: FileText, label: "Documentation", path: "/docs", minTier: "idle" },
  { icon: Gift, label: "Referral Program", path: "/referral", minTier: "idle" },
  { icon: MessageCircle, label: "Support", path: "/support", minTier: "idle" },
  { icon: HelpCircle, label: "Feature Requests", path: "/feature-requests", minTier: "idle" },
  { icon: Smartphone, label: "Get the App", path: "/install", minTier: "idle" },

  { icon: Globe, label: "About Us", path: "/about", minTier: "idle" },
  { icon: Activity, label: "System Status", path: "/system-status", minTier: "idle" },
  { icon: Code2, label: "API Reference", path: "/api-reference", minTier: "idle" },
  { icon: BookOpen, label: "Help Center", path: "/help", minTier: "idle" },
  { icon: Scale, label: "Legal", path: "/legal", minTier: "idle" },

  { icon: Settings, label: "Settings", path: "/settings", minTier: "idle" },
];

const tierOrder = ["idle", "beginner", "active"];

const statusConfig = {
  idle: { label: "Idle", color: "bg-amber/20 text-amber", icon: Zap },
  beginner: { label: "Beginner", color: "bg-primary/20 text-primary", icon: TrendingUp },
  active: { label: "Active", color: "bg-emerald/20 text-emerald", icon: Crown },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useTransactionNotifications(user?.id);

  const userStatus = profile?.account_status || "idle";
  const statusInfo = statusConfig[userStatus];

  const isLocked = (minTier: string) => {
    return tierOrder.indexOf(minTier) > tierOrder.indexOf(userStatus);
  };

  const navItems = isAdmin
    ? [...allNavItems, { icon: Shield, label: "Admin Panel", path: "/admin", minTier: "idle" }]
    : allNavItems;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>

      <motion.aside
        className={`fixed lg:relative z-50 h-full flex flex-col transition-all duration-300 ${
          collapsed ? "w-[72px]" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: "hsl(var(--sidebar-background))" }}
      >
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-bold text-sidebar-foreground tracking-tight">
              BrightPay
            </motion.span>
          )}
          <Button variant="ghost" size="icon" className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent hidden lg:flex h-7 w-7" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="ml-auto text-sidebar-foreground/60 lg:hidden h-7 w-7" onClick={() => setMobileOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {!collapsed && (
          <div className="px-4 py-3">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${statusInfo.color} text-xs font-semibold`}>
              <statusInfo.icon className="w-3.5 h-3.5" />
              <span>{statusInfo.label} Account</span>
            </div>
          </div>
        )}

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const locked = isLocked(item.minTier);
            return (
              <Link key={item.path} to={locked ? "#" : item.path}
                onClick={(e) => { if (locked) e.preventDefault(); setMobileOpen(false); }}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all btn-press ${
                  active ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : locked ? "text-sidebar-foreground/30 cursor-not-allowed"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                }`}>
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {!collapsed && locked && <Lock className="w-3.5 h-3.5" />}
              </Link>
            );
          })}
        </nav>

        {!collapsed && userStatus !== "active" && (
          <div className="px-4 pb-4">
            <div className="p-3 rounded-xl bg-sidebar-accent border border-sidebar-border">
              <p className="text-xs font-semibold text-sidebar-foreground mb-1">
                {userStatus === "idle" ? "🚀 Unlock More Features" : "⚡ Activate Full Access"}
              </p>
              <p className="text-[11px] text-sidebar-foreground/60 mb-2">
                {userStatus === "idle" ? "Complete KYC to create payment endpoints" : "Pay KES 1,000 to unlock all features"}
              </p>
              <Button size="sm" className="w-full h-8 text-xs gradient-primary text-primary-foreground btn-press"
                onClick={() => navigate(userStatus === "idle" ? "/kyc" : "/settings")}>
                {userStatus === "idle" ? "Start KYC" : "Activate Now"}
              </Button>
            </div>
          </div>
        )}

        <div className="px-3 py-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-sidebar-foreground/70" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name || "User"}</p>
                <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
              </div>
            )}
            {!collapsed && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center gap-4 px-4 lg:px-6 flex-shrink-0">
          <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1" />
          <GlobalSearch />
          <div className="flex items-center gap-2 ml-auto">
            <NotificationCenter userId={user?.id || ""} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>
            {children}
          </motion.div>
        </main>
      </div>

      <QuickPayFAB />
      <AiAssistant contextHint="Need help navigating? Ask me anything about BrightPay!" />
    </div>
  );
}
