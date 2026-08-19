import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
export default function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  const greeting = time.getHours() < 12 ? "Good Morning ☀️" : time.getHours() < 17 ? "Good Afternoon 🌤️" : "Good Evening 🌙";
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-xs">
      <Clock className="w-3.5 h-3.5 text-primary" />
      <span className="font-semibold text-foreground">{time.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">{greeting}</span>
    </div>
  );
}
