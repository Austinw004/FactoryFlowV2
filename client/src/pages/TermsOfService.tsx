import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function TermsOfService() {
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
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: April 2026</p>

          <Card className="p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing or using Prescient Labs ("the Service"), you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground">
                Prescient Labs is a manufacturing intelligence platform that provides demand forecasting, 
                market timing signals, material allocation optimization, and supply chain visibility tools. 
                The Service is designed to help manufacturers make data-driven decisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
              <div className="text-muted-foreground space-y-2">
                <p>To use the Service, you must:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Create an account with accurate information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Be at least 18 years old or have parental consent</li>
                  <li>Be authorized to bind your organization to these terms</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Subscription and Payment</h2>
              <div className="text-muted-foreground space-y-2">
                <p>
                  The Service is offered on a subscription basis. By subscribing, you agree to:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Pay all applicable fees for your chosen plan</li>
                  <li>Provide accurate billing information</li>
                  <li>Accept automatic renewal unless cancelled before the renewal date</li>
                  <li>Acknowledge that fees are non-refundable except as required by law</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Data and Privacy</h2>
              <p className="text-muted-foreground">
                Your use of the Service is also governed by our Privacy Policy. You retain ownership of all data 
                you upload to the Service. We process your data only to provide and improve the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Acceptable Use</h2>
              <div className="text-muted-foreground space-y-2">
                <p>You agree not to:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Use the Service for any illegal purpose</li>
                  <li>Attempt to gain unauthorized access to the Service</li>
                  <li>Interfere with or disrupt the Service</li>
                  <li>Reverse engineer or attempt to extract source code</li>
                  <li>Share account credentials with unauthorized parties</li>
                  <li>Upload malicious code or content</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
              <p className="text-muted-foreground">
                The Service, including its algorithms, models, and proprietary methodologies (including the FDR model), 
                are owned by Prescient Labs. You are granted a limited license to use the Service for your 
                internal business purposes during your subscription period.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground">
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. FORECASTS AND RECOMMENDATIONS 
                ARE BASED ON HISTORICAL DATA AND MODELS AND SHOULD NOT BE RELIED UPON AS THE SOLE BASIS FOR 
                BUSINESS DECISIONS. WE DO NOT GUARANTEE THE ACCURACY OF ANY PREDICTIONS.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, PRESCIENT LABS SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>
              <p className="text-muted-foreground">
                Either party may terminate this agreement at any time. Upon termination, your access to the Service 
                will cease, and you may request export of your data within 30 days. We reserve the right to 
                terminate accounts that violate these terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We may update these terms from time to time. We will notify you of material changes via email 
                or through the Service. Continued use after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Contact</h2>
              <p className="text-muted-foreground">
                For questions about these Terms of Service, please contact us at legal@prescient-labs.com.
              </p>
            </section>
          </Card>

          <div className="mt-8 flex gap-4">
            <Button variant="outline" onClick={() => setLocation("/privacy")} data-testid="button-view-privacy">
              View Privacy Policy
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
