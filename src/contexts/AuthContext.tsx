import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  account_status: "idle" | "beginner" | "active";
  kyc_status: "not_submitted" | "pending" | "approved" | "rejected";
  activation_paid: boolean;
  banned: boolean;
  can_deposit: boolean;
  can_withdraw: boolean;
  can_create_endpoints: boolean;
  current_package_id: string | null;
  referral_code: string | null;
  flagged: boolean;
  withdrawal_review_required: boolean;
}

interface Wallet {
  id: string;
  type: "income" | "service";
  balance: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  wallets: Wallet[];
  isAdmin: boolean;
  loading: boolean;
  incomeBalance: number;
  serviceBalance: number;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshWallets: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  wallets: [],
  isAdmin: false,
  loading: true,
  incomeBalance: 0,
  serviceBalance: 0,
  signOut: async () => {},
  refreshProfile: async () => {},
  refreshWallets: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data as unknown as Profile);
  };

  const fetchWallets = async (userId: string) => {
    const { data } = await supabase.from("wallets").select("*").eq("user_id", userId);
    if (data) setWallets(data as unknown as Wallet[]);
  };

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
    setIsAdmin((data && data.length > 0) || false);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const refreshWallets = async () => {
    if (user) await fetchWallets(user.id);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Use setTimeout to avoid Supabase deadlock
        setTimeout(() => {
          fetchProfile(session.user.id);
          fetchWallets(session.user.id);
          checkAdmin(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setWallets([]);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchWallets(session.user.id);
        checkAdmin(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Realtime wallet updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("wallet-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` }, () => {
        fetchWallets(user.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const incomeBalance = wallets.find(w => w.type === "income")?.balance || 0;
  const serviceBalance = wallets.find(w => w.type === "service")?.balance || 0;

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setWallets([]);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, wallets, isAdmin, loading, incomeBalance, serviceBalance, signOut, refreshProfile, refreshWallets }}>
      {children}
    </AuthContext.Provider>
  );
}
