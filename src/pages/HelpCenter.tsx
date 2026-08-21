import { useState } from "react";
import { Search, ChevronDown, ChevronRight, BookOpen, MessageSquare, Mail, Phone, ExternalLink, FileText, Video, Shield, Zap, CreditCard, AlertTriangle, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import FeedbackWidget from "@/components/FeedbackWidget";
import TicketSystem from "@/components/TicketSystem";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string[];
}

const faqCategories = [
  { id: "getting-started", label: "Getting Started", icon: Zap, color: "text-blue-500" },
  { id: "payments", label: "Payments", icon: CreditCard, color: "text-green-500" },
  { id: "account", label: "Account & Security", icon: Shield, color: "text-purple-500" },
  { id: "troubleshooting", label: "Troubleshooting", icon: AlertTriangle, color: "text-orange-500" },
  { id: "billing", label: "Billing & Fees", icon: FileText, color: "text-cyan-500" },
];

const faqItems: FAQItem[] = [
  { id: "1", category: "getting-started", question: "How do I create my first payment endpoint?", answer: "Navigate to the Endpoints page, click 'Create Endpoint', enter a name and amount, and your endpoint is ready. You can share the payment link or QR code immediately.", tags: ["setup", "endpoint"] },
  { id: "2", category: "getting-started", question: "What is M-Pesa and how does BrightPay integrate with it?", answer: "M-Pesa is a mobile money service widely used in Kenya. BrightPay uses the Safaricom Daraja API to initiate STK push prompts directly to your customers' phones, making payments seamless.", tags: ["mpesa", "integration"] },
  { id: "3", category: "getting-started", question: "How do I verify my KYC (Know Your Customer)?", answer: "Go to Settings > KYC Verification. Upload your national ID or passport, and we'll verify within 24 hours. Verified accounts have higher transaction limits.", tags: ["kyc", "verification"] },
  { id: "4", category: "getting-started", question: "Can I use BrightPay for my business?", answer: "Absolutely! BrightPay supports business accounts with multiple endpoints, team members, detailed analytics, and bulk payments. All features work for both personal and business use.", tags: ["business", "commercial"] },
  { id: "5", category: "payments", question: "How long do M-Pesa payments take to process?", answer: "STK push payments are typically processed within 10-30 seconds. The customer receives a prompt on their phone to enter their M-Pesa PIN. Once confirmed, the status updates in real-time on your dashboard.", tags: ["speed", "processing"] },
  { id: "6", category: "payments", question: "What are the transaction fees?", answer: "BrightPay charges a flat 1% processing fee on all transactions, with a minimum of KES 5 and maximum of KES 50 per transaction. There are no hidden fees, monthly charges, or setup costs.", tags: ["fees", "pricing"] },
  { id: "7", category: "payments", question: "Can I process bulk payments?", answer: "Yes! Go to Bulk Pay and upload a CSV file with phone numbers and amounts. We'll process all payments sequentially and give you a status report for each.", tags: ["bulk", "csv"] },
  { id: "8", category: "payments", question: "What is the maximum amount per transaction?", answer: "Individual transactions can be up to KES 150,000. Daily limits apply based on your KYC status: KES 50,000/day for unverified accounts, KES 500,000/day for verified accounts.", tags: ["limit", "maximum"] },
  { id: "9", category: "payments", question: "How do I generate a payment link for customers?", answer: "Each endpoint automatically generates a payment link. You can also use the Payment Link Generator tool on the Endpoints page to create custom links with preset amounts and references.", tags: ["link", "sharing"] },
  { id: "10", category: "payments", question: "Can I schedule recurring payments?", answer: "Yes! Use the Scheduled Payments feature in the Dashboard tools. Set a frequency (daily, weekly, monthly), enter the details, and payments will be initiated automatically.", tags: ["recurring", "scheduled"] },
  { id: "11", category: "account", question: "How do I enable two-factor authentication?", answer: "Go to Settings > Security > Two-Factor Authentication and toggle it on. You'll need to verify via SMS code each time you log in. This adds an extra layer of security to your account.", tags: ["2fa", "security"] },
  { id: "12", category: "account", question: "Can I invite team members to my account?", answer: "Business accounts can invite team members via Settings > Team. Each member can be assigned a role (Admin, Viewer, Operator) with appropriate permissions.", tags: ["team", "collaboration"] },
  { id: "13", category: "account", question: "How do I reset my password?", answer: "Click 'Forgot Password' on the login page, enter your email, and follow the link we send you. If you can't access your email, contact support with your account verification details.", tags: ["password", "login"] },
  { id: "14", category: "account", question: "Is my data secure?", answer: "We use AES-256 encryption for data at rest, TLS 1.3 for data in transit, and comply with all Kenyan data protection regulations (DPA 2019). Your M-Pesa credentials are never stored — all payments are processed through Safaricom's secure API.", tags: ["security", "encryption"] },
  { id: "15", category: "troubleshooting", question: "Why did my STK push fail?", answer: "STK pushes can fail for several reasons: insufficient M-Pesa balance, wrong phone number format (use 254XXXXXXXXXX), customer cancelled the prompt, or network issues. Check the error code in your transaction details for specifics.", tags: ["error", "failed"] },
  { id: "16", category: "troubleshooting", question: "My dashboard isn't showing recent transactions", answer: "Try refreshing the page. If transactions are still missing, check your internet connection and ensure you're logged into the correct account. The real-time listener may need a moment to reconnect.", tags: ["refresh", "loading"] },
  { id: "17", category: "troubleshooting", question: "How do I contact support?", answer: "Use the contact form below, email support@brightpay.co.ke, or call our helpline at +254 700 000 000. We're available Monday–Friday 8AM–6PM EAT, and Saturday 9AM–1PM EAT.", tags: ["support", "contact"] },
  { id: "18", category: "billing", question: "How do I download my invoices?", answer: "Go to Settings > Billing and click 'Download Invoice' next to any transaction. You can also download a monthly summary PDF with all transactions grouped.", tags: ["invoice", "download"] },
  { id: "19", category: "billing", question: "Do you offer refunds?", answer: "Processing fees are non-refundable once a transaction completes. If a transaction fails or times out, you're not charged. For disputes, contact support within 7 days with the transaction reference.", tags: ["refund", "dispute"] },
  { id: "20", category: "billing", question: "What payment methods do you accept for fees?", answer: "Transaction fees are automatically deducted from your M-Pesa wallet. You can also top up your BrightPay balance via M-Pesa for faster processing. No credit cards needed.", tags: ["payment", "billing"] },
];

const quickGuides = [
  { title: "Getting Started Guide", description: "Set up your first payment in 5 minutes", icon: Zap, time: "5 min", link: "#" },
  { title: "Bulk Payments Guide", description: "Learn how to process CSV payments", icon: FileText, time: "10 min", link: "#" },
  { title: "API Integration Guide", description: "Integrate BrightPay into your app", icon: BookOpen, time: "15 min", link: "#" },
  { title: "Security Best Practices", description: "Keep your account safe", icon: Shield, time: "8 min", link: "#" },
  { title: "Video Tutorials", description: "Watch step-by-step walkthroughs", icon: Video, time: "Various", link: "#" },
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredFAQs = faqItems.filter((item) => {
    const matchesSearch = searchQuery === "" || item.question.toLowerCase().includes(searchQuery.toLowerCase()) || item.answer.toLowerCase().includes(searchQuery.toLowerCase()) || item.tags.some((t) => t.includes(searchQuery.toLowerCase()));
    const matchesCategory = activeCategory === null || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryCount = (catId: string) => faqItems.filter((i) => i.category === catId).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold mb-2">Help Center</h1>
            <p className="text-blue-100 mb-6">Search our knowledge base or browse categories below</p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
              <Input
                placeholder="Search for answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 bg-white/15 border-white/20 text-white placeholder:text-white/50 focus:bg-white/25 focus:border-white/40 h-12"
              />
            </div>
          </div>
        </div>

        {/* Quick Guides */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Quick Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {quickGuides.map((guide) => (
              <Card key={guide.title} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <guide.icon className="w-8 h-8 text-primary mb-2" />
                  <h3 className="font-medium text-sm">{guide.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{guide.description}</p>
                  <Badge variant="outline" className="mt-2 text-[10px]">{guide.time}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {faqCategories.map((cat) => (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? "default" : "outline"}
              className="flex items-center gap-2 h-auto py-3"
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
            >
              <cat.icon className={`w-4 h-4 ${cat.color}`} />
              <span className="text-xs">{cat.label}</span>
              <Badge variant="secondary" className="ml-auto text-[10px]">{getCategoryCount(cat.id)}</Badge>
            </Button>
          ))}
        </div>

        {/* FAQ List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Frequently Asked Questions
              <Badge variant="secondary" className="ml-auto">{filteredFAQs.length} results</Badge>
            </CardTitle>
            <CardDescription>Click a question to expand the answer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No results found for "{searchQuery}"</p>
                <p className="text-sm mt-1">Try a different search term or browse categories above</p>
              </div>
            ) : (
              filteredFAQs.map((item) => (
                <Collapsible key={item.id} open={openItems.has(item.id)} onOpenChange={() => toggleItem(item.id)}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
                      {openItems.has(item.id) ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                      <span className="font-medium text-sm">{item.question}</span>
                      <Badge variant="outline" className="ml-auto text-[10px] capitalize">{item.category.replace("-", " ")}</Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-10 pr-4 pb-4 text-sm text-muted-foreground leading-relaxed">{item.answer}</div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </CardContent>
        </Card>

        {/* Contact Support */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <Mail className="w-10 h-10 mx-auto text-blue-500 mb-3" />
              <h3 className="font-semibold mb-1">Email Support</h3>
              <p className="text-sm text-muted-foreground mb-3">Get a response within 4 hours</p>
              <Button variant="outline" size="sm" asChild>
                <a href="mailto:support@brightpay.co.ke">
                  support@brightpay.co.ke <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <Phone className="w-10 h-10 mx-auto text-green-500 mb-3" />
              <h3 className="font-semibold mb-1">Phone Support</h3>
              <p className="text-sm text-muted-foreground mb-3">Mon–Fri 8AM–6PM EAT</p>
              <Button variant="outline" size="sm" asChild>
                <a href="tel:+254700000000">+254 700 000 000</a>
              </Button>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <MessageSquare className="w-10 h-10 mx-auto text-purple-500 mb-3" />
              <h3 className="font-semibold mb-1">Live Chat</h3>
              <p className="text-sm text-muted-foreground mb-3">Chat with our team in real-time</p>
              <Button variant="outline" size="sm">Start Chat</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    
      <div className="mt-6">
        <TicketSystem />
      </div>
      <div className="mt-6">
        <FeedbackWidget />
      </div>
    </DashboardLayout>
  );
}
