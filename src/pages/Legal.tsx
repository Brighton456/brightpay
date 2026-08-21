import { useState } from "react";
import { FileText, Shield, Cookie, RotateCcw, ChevronRight, Download, ExternalLink, Scale, Lock, Eye, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import PolicyDownloader from "@/components/PolicyDownloader";
import DashboardLayout from "@/components/layout/DashboardLayout";

type LegalSection = "terms" | "privacy" | "cookies" | "refunds";

const policies = [
  { id: "terms" as LegalSection, title: "Terms of Service", icon: FileText, description: "Our terms of service agreement", updated: "August 2026", color: "text-blue-500" },
  { id: "privacy" as LegalSection, title: "Privacy Policy", icon: Shield, description: "How we handle your data", updated: "August 2026", color: "text-green-500" },
  { id: "cookies" as LegalSection, title: "Cookie Policy", icon: Cookie, description: "Our use of cookies", updated: "August 2026", color: "text-orange-500" },
  { id: "refunds" as LegalSection, title: "Refund Policy", icon: RotateCcw, description: "Refund terms and conditions", updated: "August 2026", color: "text-purple-500" },
];

const termsOfService = `
# Terms of Service — BrightPay

**Effective Date:** August 1, 2026  
**Last Updated:** August 1, 2026

## 1. Introduction

Welcome to BrightPay ("Platform," "Service," "we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of the BrightPay payment processing platform, website, APIs, and related services (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms.

BrightPay is operated by BrightPay Technologies Limited, a company registered in the Republic of Kenya (Registration No. XXXXXX).

## 2. Acceptance of Terms

By creating an account, accessing, or using BrightPay, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree, you must not use the Services.

## 3. Eligibility

- You must be at least 18 years old to use BrightPay
- You must be a resident of Kenya or a supported country
- You must have a valid M-Pesa-registered mobile number
- Business accounts must provide valid business registration documents
- You must complete KYC verification for enhanced features

## 4. Account Registration

### 4.1 Account Creation
To use BrightPay, you must create an account by providing:
- Full legal name
- Valid email address
- M-Pesa-registered phone number
- Physical address

### 4.2 Account Security
You are responsible for maintaining the confidentiality of your account credentials. You must:
- Use a strong, unique password
- Enable two-factor authentication (recommended)
- Never share your account credentials
- Immediately report any unauthorized access

### 4.3 Account Verification
BrightPay reserves the right to verify your identity at any time. Enhanced features (higher limits, bulk payments, team access) require KYC verification.

## 5. Services Description

### 5.1 Payment Processing
BrightPay facilitates M-Pesa payments through Safaricom's Daraja API. We provide:
- STK Push payment initiation
- Payment link and QR code generation
- Real-time transaction monitoring
- Bulk payment processing
- Payment analytics and reporting

### 5.2 Account Features
- Dashboard with real-time analytics
- Multiple payment endpoints
- Transaction history and receipts (PDF)
- Team management (business accounts)
- API access (developer accounts)

## 6. Fees and Payment

### 6.1 Transaction Fees
- Standard processing fee: 1% per transaction
- Minimum fee: KES 5 per transaction
- Maximum fee: KES 50 per transaction
- No monthly subscription fees
- No setup or account maintenance fees

### 6.2 Fee Deduction
Fees are automatically deducted from each transaction. You receive 99% of each processed payment.

### 6.3 Fee Changes
We may change our fee structure with 30 days' notice via email and in-app notification.

## 7. Transaction Limits

| Account Type | Per Transaction | Daily Limit | Monthly Limit |
|-------------|----------------|-------------|---------------|
| Basic (Unverified) | KES 70,000 | KES 150,000 | KES 1,000,000 |
| Verified | KES 150,000 | KES 500,000 | KES 10,000,000 |
| Business | KES 150,000 | KES 1,000,000 | Custom |

## 8. Prohibited Activities

You agree NOT to:
- Use BrightPay for illegal purposes (money laundering, fraud, terrorism financing)
- Process payments for prohibited goods or services
- Attempt to circumvent transaction limits or security measures
- Resell or redistribute BrightPay services without authorization
- Use automated scripts or bots to interact with the Platform
- Submit false or misleading information during registration
- Interfere with or disrupt the Platform's infrastructure

## 9. Intellectual Property

All content, trademarks, logos, software, and documentation on BrightPay are the property of BrightPay Technologies Limited. You are granted a limited, non-exclusive, non-transferable license to use the Services for their intended purpose.

## 10. Limitation of Liability

BrightPay Technologies Limited shall not be liable for:
- Indirect, incidental, special, or consequential damages
- Loss of profits, data, or business opportunities
- Service interruptions due to maintenance, third-party providers, or force majeure
- Actions or inactions of Safaricom, mobile network operators, or banking partners

Our total liability shall not exceed the fees you paid to BrightPay in the 12 months preceding the claim.

## 11. Indemnification

You agree to indemnify and hold harmless BrightPay Technologies Limited, its officers, directors, employees, and agents from any claims, losses, or damages arising from your use of the Services or violation of these Terms.

## 12. Termination

### 12.1 By You
You may terminate your account at any time by contacting support@brightpay.co.ke. Outstanding balances will be settled within 7 business days.

### 12.2 By BrightPay
We may suspend or terminate your account if you:
- Violate these Terms
- Engage in prohibited activities
- Fail to complete required KYC verification
- Are the subject of a legal investigation

## 13. Dispute Resolution

### 13.1 Governing Law
These Terms are governed by the laws of the Republic of Kenya.

### 13.2 Arbitration
Disputes shall first be resolved through good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration under the Nairobi Centre for International Arbitration (NCIA) rules.

## 14. Changes to Terms

We reserve the right to modify these Terms at any time. Material changes will be communicated via email and in-app notification at least 30 days before taking effect. Continued use of the Services constitutes acceptance of the modified Terms.

## 15. Contact

For questions about these Terms:
- **Email:** legal@brightpay.co.ke
- **Address:** BrightPay Technologies Limited, Nairobi, Kenya
- **Phone:** +254 700 000 000
`;

const privacyPolicy = `
# Privacy Policy — BrightPay

**Effective Date:** August 1, 2026  
**Last Updated:** August 1, 2026

## 1. Introduction

BrightPay Technologies Limited ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our payment processing platform.

## 2. Information We Collect

### 2.1 Personal Information
- Full name and legal name
- Email address
- Phone number (M-Pesa registered)
- Physical address
- National ID or passport number (for KYC verification)
- Business registration documents (for business accounts)

### 2.2 Transaction Information
- Payment amounts and recipients
- Transaction timestamps and status
- M-Pesa transaction references
- Payment endpoint configurations

### 2.3 Technical Information
- IP address and browser type
- Device information (OS, screen resolution)
- Usage analytics (pages visited, features used)
- Cookies and session data

### 2.4 Information We Do NOT Collect
- We NEVER store your M-Pesa PIN
- We NEVER access your M-Pesa account balance
- We NEVER store full M-Pesa account numbers beyond what's needed for transaction processing

## 3. How We Use Your Information

| Purpose | Legal Basis |
|---------|------------|
| Process payments via Safaricom Daraja API | Contract performance |
| Verify identity (KYC) | Legal obligation |
| Send transaction receipts and notifications | Contract performance |
| Improve platform features and UX | Legitimate interest |
| Detect and prevent fraud | Legitimate interest |
| Comply with regulatory requirements | Legal obligation |
| Send marketing communications (opt-in only) | Consent |

## 4. Data Sharing

### 4.1 Third-Party Services
We share data only with essential service providers:
- **Safaricom (Daraja API):** Phone numbers and payment amounts for STK push processing
- **Supabase:** Database hosting and authentication
- **Cloudflare:** CDN and security services
- **Analytics providers:** Anonymized usage data

### 4.2 Government and Regulators
We may disclose information when required by:
- Central Bank of Kenya (CBK)
- Financial Reporting Centre (FRC)
- Kenya Revenue Authority (KRA)
- Courts of law or valid legal process

### 4.3 We Never Sell Your Data
We do not sell, rent, or trade your personal information to third parties for marketing purposes.

## 5. Data Security

We implement industry-standard security measures:
- AES-256 encryption for data at rest
- TLS 1.3 encryption for data in transit
- Regular security audits and penetration testing
- SOC 2 Type II compliance (in progress)
- ISO 27001 certification (in progress)
- Role-based access controls for all employees
- Automated fraud detection and monitoring

## 6. Data Retention

| Data Type | Retention Period |
|-----------|-----------------|
| Account information | Duration of account + 7 years |
| Transaction records | 7 years (regulatory requirement) |
| KYC documents | Duration of account + 3 years |
| Server logs | 90 days |
| Marketing preferences | Until withdrawal of consent |

## 7. Your Rights

Under the Kenya Data Protection Act 2019, you have the right to:
- **Access** your personal data
- **Rectify** inaccurate or incomplete data
- **Delete** your data (subject to legal retention requirements)
- **Object** to data processing for legitimate interests
- **Withdraw consent** for consent-based processing
- **Data portability** — receive your data in a structured format
- **Lodge a complaint** with the Office of the Data Protection Commissioner

## 8. Cookies

| Cookie Type | Purpose | Duration |
|-------------|---------|----------|
| Essential | Authentication and security | Session |
| Functional | Remember preferences (theme, language) | 1 year |
| Analytics | Usage statistics (anonymized) | 2 years |

## 9. Children's Privacy

BrightPay is not intended for users under 18 years of age. We do not knowingly collect data from children.

## 10. International Transfers

Your data is primarily stored in Kenya. If transferred internationally, we ensure adequate protection through Standard Contractual Clauses or equivalent safeguards.

## 11. Changes to This Policy

We will notify you of material changes via email and in-app notification at least 30 days before they take effect.

## 12. Contact

For privacy-related inquiries:
- **Email:** privacy@brightpay.co.ke
- **Data Protection Officer:** dpo@brightpay.co.ke
- **Address:** BrightPay Technologies Limited, Nairobi, Kenya
- **ODPC:** complaints@odpc.go.ke
`;

const cookiePolicy = `
# Cookie Policy — BrightPay

**Effective Date:** August 1, 2026

## What Are Cookies

Cookies are small text files stored on your device when you visit a website. They help us provide a better experience by remembering your preferences and understanding how you use our platform.

## How We Use Cookies

### Essential Cookies (Required)
These cookies are necessary for BrightPay to function:
- **Session cookie:** Keeps you logged in
- **Security cookie:** Protects against CSRF attacks
- **Load balancer cookie:** Routes you to the correct server

### Functional Cookies (Optional)
These enhance your experience:
- **Theme preference:** Remembers light/dark mode
- **Language preference:** Remembers your language
- **Dashboard layout:** Remembers widget positions

### Analytics Cookies (Optional)
Help us understand usage:
- **Page views:** Which pages you visit
- **Feature usage:** Which tools you use most
- **Performance:** Page load times and errors

## Managing Cookies

You can control cookies through:
1. **Browser settings:** Most browsers allow you to block or delete cookies
2. **BrightPay settings:** Settings > Privacy > Cookie Preferences
3. **Opt-out links:** Available in our cookie consent banner

**Note:** Blocking essential cookies may prevent BrightPay from functioning correctly.

## Third-Party Cookies

| Provider | Purpose | Privacy Policy |
|----------|---------|---------------|
| Google Analytics | Anonymized analytics | google.com/privacy |
| Cloudflare | Security and CDN | cloudflare.com/privacy |
| Sentry | Error tracking | sentry.io/privacy |

## Updates

This Cookie Policy may be updated periodically. Check this page for changes.

## Contact

Email: privacy@brightpay.co.ke
`;

const refundPolicy = `
# Refund Policy — BrightPay

**Effective Date:** August 1, 2026

## Overview

At BrightPay, we aim to provide reliable payment processing. This policy outlines when refunds apply.

## Transaction Failures

### Automatic Refunds
If a transaction fails or times out, you are NOT charged any processing fee. Failed transactions are automatically reversed by M-Pesa/Safaricom.

### Common Failure Scenarios
- Customer cancelled the STK push prompt
- Insufficient M-Pesa balance
- Network timeout (no response from Safaricom)
- Invalid phone number format
- System error on our end

**Processing time:** Failed transactions are reversed immediately by Safaricom. If you see a deduction, it typically reflects within 24 hours.

## Successful Transactions

### Generally Non-Refundable
Once a payment is successfully processed (customer entered PIN and confirmed), the transaction is complete. Processing fees for successful transactions are non-refundable.

### Exceptions
We may issue refunds in these cases:
- **Duplicate charges:** If the same transaction was processed twice due to a system error
- **Incorrect amounts:** If the charged amount differs from the requested amount due to a BrightPay error
- **Service failure:** If the platform malfunctioned causing unintended transactions

### How to Request a Refund
1. Go to Settings > Billing or your Transaction History
2. Find the transaction in question
3. Click "Report Issue" or email support@brightpay.co.ke
4. Include the transaction reference and description of the issue
5. Our team will review within 48 hours

## Refund Processing

| Refund Type | Processing Time | Method |
|-------------|----------------|--------|
| Failed transaction (auto-reverse) | Immediate–24 hours | M-Pesa reversal |
| Duplicate charge | 2–5 business days | M-Pesa refund |
| BrightPay error | 2–5 business days | M-Pesa refund |
| Billing dispute | 5–10 business days | M-Pesa refund or credit |

## Disputes

If you disagree with a transaction outcome:
1. Contact support within 7 days of the transaction
2. Provide the transaction reference and supporting evidence
3. We will investigate and respond within 48 hours
4. If unresolved, you may escalate to the Central Bank of Kenya

## Chargebacks

BrightPay does not support chargebacks in the traditional sense. M-Pesa transactions are irrevocable once confirmed. Disputes must go through our resolution process or the CBK dispute mechanism.

## Contact

For refund inquiries:
- **Email:** support@brightpay.co.ke
- **Phone:** +254 700 000 000
- **Hours:** Mon–Fri 8AM–6PM EAT, Sat 9AM–1PM EAT
`;

const sectionContent: Record<LegalSection, string> = {
  terms: termsOfService,
  privacy: privacyPolicy,
  cookies: cookiePolicy,
  refunds: refundPolicy,
};

export default function Legal() {
  const [activeSection, setActiveSection] = useState<LegalSection>("terms");

  const content = sectionContent[activeSection];
  const sections = content.split("\n## ").map((s, i) => (i === 0 ? s : "## " + s));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Scale className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Legal & Compliance</h1>
          </div>
          <p className="text-slate-300">Transparent policies to protect you and your business</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="space-y-2">
            {policies.map((policy) => (
              <Button
                key={policy.id}
                variant={activeSection === policy.id ? "default" : "ghost"}
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => setActiveSection(policy.id)}
              >
                <policy.icon className={`w-5 h-5 ${policy.color}`} />
                <div className="text-left">
                  <div className="text-sm font-medium">{policy.title}</div>
                  <div className="text-xs text-muted-foreground">Updated {policy.updated}</div>
                </div>
              </Button>
            ))}

            <Separator className="my-4" />

            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-medium">Certified Compliant</span>
                </div>
                <div className="space-y-1.5">
                  <Badge variant="outline" className="text-[10px]">Kenya DPA 2019</Badge>
                  <Badge variant="outline" className="text-[10px]">CBK Regulations</Badge>
                  <Badge variant="outline" className="text-[10px]">PCI DSS Ready</Badge>
                </div>
              </CardContent>
            </Card>

            <Button variant="outline" className="w-full mt-2" size="sm">
              <Download className="w-4 h-4 mr-2" /> Download PDF
            </Button>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-8">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {sections.map((section, idx) => {
                    const lines = section.split("\n");
                    const title = lines[0]?.replace(/^#+\s*/, "").trim();
                    const body = lines.slice(1).join("\n").trim();

                    // Handle tables
                    const tableRows = body.split("\n").filter((l) => l.includes("|"));
                    const isTable = tableRows.length > 2;

                    return (
                      <div key={idx} className="mb-6">
                        {idx === 0 ? (
                          <h1 className="text-2xl font-bold mb-4">{title}</h1>
                        ) : (
                          <h2 className="text-lg font-semibold mt-6 mb-3">{title}</h2>
                        )}
                        {isTable ? (
                          <div className="overflow-x-auto my-3">
                            <table className="w-full text-sm border-collapse">
                              <thead>
                                <tr className="border-b">
                                  {tableRows[0]?.split("|").filter(Boolean).map((cell, ci) => (
                                    <th key={ci} className="text-left p-2 font-medium">{cell.trim()}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {tableRows.slice(2).map((row, ri) => (
                                  <tr key={ri} className="border-b border-dashed">
                                    {row.split("|").filter(Boolean).map((cell, ci) => (
                                      <td key={ci} className="p-2 text-muted-foreground">{cell.trim()}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                            {body.split("\n").map((line, li) => {
                              if (line.startsWith("### ")) return <h3 key={li} className="text-base font-medium mt-4 mb-2 text-foreground">{line.replace("### ", "")}</h3>;
                              if (line.startsWith("- **")) {
                                const match = line.match(/^- \*\*(.+?)\*\*:?\s*(.*)$/);
                                if (match) return <p key={li} className="text-sm"><strong>{match[1]}:</strong> {match[2]}</p>;
                              }
                              if (line.startsWith("- ")) return <li key={li} className="ml-4 text-sm">{line.replace("- ", "")}</li>;
                              if (line.startsWith("| ")) return null; // skip table fragments
                              if (line.trim() === "") return <br key={li} />;
                              return <p key={li} className="text-sm mb-1">{line}</p>;
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Help Banner */}
            <Card className="mt-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
              <CardContent className="p-6 flex items-center gap-4">
                <AlertTriangle className="w-10 h-10 text-blue-500 shrink-0" />
                <div>
                  <h3 className="font-semibold">Questions about our policies?</h3>
                  <p className="text-sm text-muted-foreground">Our legal team is available to clarify any questions about our terms, privacy, or compliance.</p>
                </div>
                <Button variant="outline" className="ml-auto shrink-0">
                  Contact Legal <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    
      <div className="mt-6">
        <PolicyDownloader />
      </div>
    </DashboardLayout>
  );
}
