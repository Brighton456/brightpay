import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Shield, Cookie, RotateCcw } from "lucide-react";

const policies = [
  { id: "terms", title: "Terms of Service", icon: FileText, size: "24 KB", color: "text-blue-500" },
  { id: "privacy", title: "Privacy Policy", icon: Shield, size: "28 KB", color: "text-green-500" },
  { id: "cookies", title: "Cookie Policy", icon: Cookie, size: "12 KB", color: "text-orange-500" },
  { id: "refunds", title: "Refund Policy", icon: RotateCcw, size: "15 KB", color: "text-purple-500" },
];

export default function PolicyDownloader() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Download className="w-4 h-4" /> Download Policies</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {policies.map((p) => (
          <Button key={p.id} variant="outline" className="w-full justify-start" size="sm">
            <p.icon className={`w-4 h-4 mr-2 ${p.color}`} />
            <span className="flex-1 text-left">{p.title}</span>
            <span className="text-xs text-muted-foreground">{p.size}</span>
            <Download className="w-3 h-3 ml-2 text-muted-foreground" />
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
