import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Ticket, Plus, Clock, CheckCircle, AlertCircle, MessageSquare } from "lucide-react";

interface Ticket {
  id: string;
  subject: string;
  status: "open" | "in-progress" | "resolved";
  priority: "low" | "medium" | "high";
  created: string;
  replies: number;
}

const sampleTickets: Ticket[] = [
  { id: "TKT-1234", subject: "STK push not reaching customer", status: "in-progress", priority: "high", created: "2 hours ago", replies: 3 },
  { id: "TKT-1230", subject: "How to integrate bulk payments API?", status: "open", priority: "medium", created: "1 day ago", replies: 1 },
  { id: "TKT-1225", subject: "Request for higher daily limit", status: "resolved", priority: "low", created: "3 days ago", replies: 5 },
];

const statusColors = { open: "bg-blue-500/10 text-blue-500", "in-progress": "bg-yellow-500/10 text-yellow-500", resolved: "bg-green-500/10 text-green-500" };
const priorityColors = { low: "text-muted-foreground", medium: "text-yellow-500", high: "text-red-500" };

export default function TicketSystem() {
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-10 h-10 mx-auto text-green-500 mb-2" />
          <p className="font-medium">Ticket Submitted!</p>
          <p className="text-sm text-muted-foreground mt-1">We'll respond within 4 hours. Track your ticket below.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setSubmitted(false)}>Submit Another</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Ticket className="w-5 h-5" /> Support Tickets</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> New Ticket</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submit a Ticket</CardTitle>
            <CardDescription>Our team typically responds within 4 hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Category</Label>
                <Select defaultValue="technical">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical Issue</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label>
                <Select defaultValue="medium">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Subject</Label><Input placeholder="Brief description of your issue" /></div>
            <div><Label>Description</Label><Textarea rows={4} placeholder="Please provide as much detail as possible..." /></div>
            <div className="flex gap-2">
              <Button onClick={() => { setSubmitted(true); setShowForm(false); }}>Submit Ticket</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {sampleTickets.map((ticket) => (
          <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-mono">{ticket.id}</span>
                <Badge className={`text-[10px] ${statusColors[ticket.status]}`}>{ticket.status}</Badge>
                <span className={`text-xs font-medium ${priorityColors[ticket.priority]}`}>{ticket.priority}</span>
                <span className="text-sm font-medium flex-1">{ticket.subject}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><MessageSquare className="w-3 h-3" />{ticket.replies}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{ticket.created}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
