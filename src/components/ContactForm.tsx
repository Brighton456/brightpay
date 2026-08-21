import { useState } from "react";
import { Send, CheckCircle, Mail, Phone, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Message Sent!</h3>
          <p className="text-muted-foreground mb-4">We'll get back to you within 24 hours.</p>
          <Button variant="outline" onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}>Send Another</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Get in Touch</h3>
        <p className="text-sm text-muted-foreground">Have a question or partnership inquiry? We'd love to hear from you.</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-blue-500" /><span className="text-sm">hello@brightpay.co.ke</span></div>
          <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-green-500" /><span className="text-sm">+254 700 000 000</span></div>
          <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-red-500" /><span className="text-sm">Nairobi, Kenya</span></div>
        </div>
      </div>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Send us a Message</CardTitle>
          <CardDescription>We respond within 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><Label>Subject</Label>
              <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })}>
                <SelectTrigger><SelectValue placeholder="Select a topic" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Inquiry</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                  <SelectItem value="support">Technical Support</SelectItem>
                  <SelectItem value="billing">Billing Question</SelectItem>
                  <SelectItem value="press">Press & Media</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Message</Label><Textarea rows={4} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
            <Button type="submit" className="w-full"><Send className="w-4 h-4 mr-2" /> Send Message</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
