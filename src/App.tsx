import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import Endpoints from "./pages/Endpoints";
import KYC from "./pages/KYC";
import Documentation from "./pages/Documentation";
import AdminPanel from "./pages/AdminPanel";
import SettingsPage from "./pages/SettingsPage";
import Pricing from "./pages/Pricing";
import Support from "./pages/Support";
import FeatureRequests from "./pages/FeatureRequests";
import Referral from "./pages/Referral";
import ServiceStatus from "./pages/ServiceStatus";
import Install from "./pages/Install";
import Fundraiser from "./pages/Fundraiser";
import Lipwa from "./pages/Lipwa";
import Channels from "./pages/Channels";
import Pay from "./pages/Pay";
import Cards from "./pages/Cards";
import BulkPay from "./pages/BulkPay";
import NotFound from "./pages/NotFound";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
            <Route path="/deposit" element={<ProtectedRoute><Deposit /></ProtectedRoute>} />
            <Route path="/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
            <Route path="/endpoints" element={<ProtectedRoute><Endpoints /></ProtectedRoute>} />
            <Route path="/kyc" element={<ProtectedRoute><KYC /></ProtectedRoute>} />
            <Route path="/docs" element={<Documentation />} />
            <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
            <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
            <Route path="/feature-requests" element={<ProtectedRoute><FeatureRequests /></ProtectedRoute>} />
            <Route path="/referral" element={<ProtectedRoute><Referral /></ProtectedRoute>} />
            <Route path="/status" element={<ServiceStatus />} />
            <Route path="/install" element={<Install />} />
            <Route path="/fundraiser" element={<ProtectedRoute><Fundraiser /></ProtectedRoute>} />
            <Route path="/lipwa" element={<ProtectedRoute><Lipwa /></ProtectedRoute>} />
            <Route path="/channels" element={<ProtectedRoute><Channels /></ProtectedRoute>} />
            <Route path="/cards" element={<ProtectedRoute><Cards /></ProtectedRoute>} />

            <Route path="/bulk-pay" element={<ProtectedRoute><BulkPay /></ProtectedRoute>} />
        <Route path="/pay/:apiKey" element={<Pay />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
  </QueryClientProvider>
);

export default App;
