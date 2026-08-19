import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Monitor, Clock } from "lucide-react";
export default function SessionInfo() {
  const [info, setInfo] = useState({ browser: "", os: "", time: new Date().toLocaleString(), uptime: 0 });
  useEffect(() => {
    const ua = navigator.userAgent;
    const browser = ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : ua.includes("Safari") ? "Safari" : "Other";
    const os = ua.includes("Win") ? "Windows" : ua.includes("Mac") ? "macOS" : ua.includes("Linux") ? "Linux" : "Other";
    setInfo({ browser, os, time: new Date().toLocaleString(), uptime: Math.floor(performance.now() / 1000) });
  }, []);
  return (
    <Card className="rounded-[1.75rem] border-border/70">
      <CardHeader><CardTitle className="text-lg font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Session</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-xs"><Monitor className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-muted-foreground"
