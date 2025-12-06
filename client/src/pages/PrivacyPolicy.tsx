import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-xl font-bold">Prescient Labs</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: December 2025</p>

          <Card className="p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground">
                Prescient Labs ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy 
                explains how we collect, use, disclose, and safeguard your information when you use our 
                manufacturing intelligence platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
              <div className="text-muted-foreground space-y-4">
                <div>
                  <h3 className="font-medium text-foreground mb-2">Account Information</h3>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Name and email address</li>
                    <li>Company name and industry</li>
                    <li>Billing and payment information</li>
                    <li>Account preferences and settings</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">Business Data</h3>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>SKU and product information</li>
                    <li>Supplier and material data</li>
                    <li>Demand and sales history</li>
                    <li>Production metrics and machinery data</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">Usage Data</h3>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Features accessed and actions taken</li>
                    <li>Log data and device information</li>
                    <li>Cookies and similar technologies</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
              <div className="text-muted-foreground space-y-2">
                <p>We use the collected information to:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Provide and maintain the Service</li>
                  <li>Generate forecasts and recommendations</li>
                  <li>Process payments and manage subscriptions</li>
                  <li>Send important service notifications</li>
                  <li>Improve and optimize the platform</li>
                  <li>Provide customer support</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Data Sharing and Disclosure</h2>
              <div className="text-muted-foreground space-y-4">
                <p>We do not sell your personal or business data. We may share information with:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Service Providers:</strong> Third parties that help us operate the platform (payment processors, cloud hosting)</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                  <li><strong>Consortium Features:</strong> Anonymized, aggregated data for peer benchmarking (only if you opt-in)</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
              <div className="text-muted-foreground space-y-2">
                <p>We implement industry-standard security measures including:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Multi-tenant data isolation</li>
                  <li>Regular security audits and monitoring</li>
                  <li>Access controls and authentication</li>
                  <li>Secure backup and disaster recovery</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your data for as long as your account is active or as needed to provide services. 
                Upon account termination, you may request data export within 30 days. We will delete your 
                data within 90 days of termination, except where retention is required by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
              <div className="text-muted-foreground space-y-2">
                <p>Depending on your jurisdiction, you may have the right to:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Access and receive a copy of your data</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Object to or restrict processing</li>
                  <li>Data portability</li>
                  <li>Withdraw consent</li>
                </ul>
                <p className="mt-2">
                  To exercise these rights, contact us at privacy@prescientlabs.com.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking</h2>
              <p className="text-muted-foreground">
                We use essential cookies to maintain your session and preferences. We may also use analytics 
                cookies to understand how the Service is used. You can control cookies through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
              <p className="text-muted-foreground">
                Your data may be processed in countries other than your own. We ensure appropriate safeguards 
                are in place for international data transfers in compliance with applicable data protection laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Children's Privacy</h2>
              <p className="text-muted-foreground">
                The Service is not intended for individuals under 18 years of age. We do not knowingly 
                collect personal information from children.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of material changes 
                via email or through the Service. The "Last updated" date indicates when the policy was last revised.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
              <div className="text-muted-foreground">
                <p>For privacy-related questions or concerns, contact us at:</p>
                <p className="mt-2">
                  Email: privacy@prescientlabs.com<br />
                  Prescient Labs<br />
                  Data Protection Officer
                </p>
              </div>
            </section>
          </Card>

          <div className="mt-8 flex gap-4">
            <Button variant="outline" onClick={() => setLocation("/terms")} data-testid="button-view-terms">
              View Terms of Service
            </Button>
            <Button onClick={() => setLocation("/")} data-testid="button-back-to-home">
              Back to Home
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
