import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
export default function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  if (online) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-amber text-white text-center py-1.5 text-xs font-semibold flex items-center justify-center gap-2">
      <WifiOff className="w-3.5 h-3.5" /> You are offline. Some features may not work.
    </div>
  );
}
