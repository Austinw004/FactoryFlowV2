import { useState } from "react";
import { useLocation } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { humanizeError } from "@/lib/humanizeError";

const SALES_EMAIL = "sales@prescient-labs.com";

interface ContactPayload {
  name: string;
  email: string;
  company: string;
  role: string;
  topic: string;
  message: string;
  /** Honeypot — real users leave this empty; bots autofill every field. */
  website: string;
}

export default function Contact() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<ContactPayload>({
    name: "",
    email: "",
    company: "",
    role: "",
    topic: "demo",
    message: "",
    website: "",
  });

  const update = (k: keyof ContactPayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.email.trim() || !form.name.trim() || !form.message.trim()) {
      toast({
        title: "Missing details",
        description: "Please fill in your name, email, and a short message.",
        variant: "destructive",
      });
      return;
    }
    // Light client-side email shape check — server re-validates.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast({
        title: "Email looks off",
        description: "Please double-check your email address — we want to be able to reply.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/contact-sales", form);
      setSubmitted(true);
    } catch (err: any) {
      // If the server responded with a 4xx validation error, show the humanized
      // message — don't fall back to mailto (the user needs to fix their input).
      const msg = String(err?.message || "");
      const is4xx = /^4\d\d:/.test(msg);
      if (is4xx) {
        toast({
          ...humanizeError(err, "Please check your input"),
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      // Genuine server reachability problem → open the user's mail client
      // with the message pre-filled. We'd rather route the lead through any
      // path than lose it.
      const subject = encodeURIComponent(
        `[${form.topic}] Prescient Labs inquiry — ${form.company || form.name}`,
      );
      const body = encodeURIComponent(
        `From: ${form.name} <${form.email}>\n` +
        `Company: ${form.company}\n` +
        `Role: ${form.role}\n` +
        `Topic: ${form.topic}\n\n` +
        `${form.message}`,
      );
      window.location.href = `mailto:${SALES_EMAIL}?subject=${subject}&body=${body}`;
      toast({
        ...humanizeError(err, "Opening your email client"),
        description:
          "We couldn't reach our contact server — opening your email client with the message pre-filled.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-bone font-sans">
      <SEOHead
        title="Talk to sales — Prescient Labs"
        description="Book a demo, request a pilot, or ask a question. We reply within one business day."
        canonicalUrl="https://prescient-labs.com/contact"
      />

      <div className="grain fixed inset-0 pointer-events-none z-0"></div>

      {/* Header */}
      <header className="border-b hair relative z-10">
        <div className="max-w-7xl mx-auto px-10 h-16 flex items-center justify-between">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-3"
            data-testid="button-home"
          >
            <div className="w-2 h-2 bg-signal"></div>
            <span className="text-sm tracking-[0.18em] font-medium">PRESCIENT LABS</span>
          </button>
          <nav className="hidden md:flex items-center gap-10 text-sm text-soft">
            <a href="/#platform" className="hover:text-bone transition">Platform</a>
            <a href="/pricing" className="hover:text-bone transition">Pricing</a>
            <a href="/security" className="hover:text-bone transition">Security</a>
          </nav>
          <a href="/signin" className="text-sm text-soft hover:text-bone transition">Sign in</a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-10 pt-32 pb-24 relative z-10">
        <div className="grid md:grid-cols-12 gap-12">
          {/* Left column — pitch */}
          <div className="md:col-span-5">
            <div className="eyebrow mb-8">Talk to sales</div>
            <h1 className="text-5xl md:text-6xl display leading-[0.95] mb-8">
              Let's see if we fit.
            </h1>
            <p className="text-soft text-lg leading-relaxed mb-10 max-w-md">
              Tell us what you operate, and we'll come back with a concrete answer on whether Prescient Labs is worth a 30-minute conversation — usually same day.
            </p>

            <div className="border-t hair pt-8 space-y-6 text-sm text-soft">
              <div>
                <div className="eyebrow mb-2">Prefer email?</div>
                <a
                  href={`mailto:${SALES_EMAIL}`}
                  className="text-bone hover:text-signal transition"
                  data-testid="link-sales-email"
                >
                  {SALES_EMAIL}
                </a>
              </div>
              <div>
                <div className="eyebrow mb-2">Response time</div>
                <div className="text-bone">Within one US business day.</div>
              </div>
              <div>
                <div className="eyebrow mb-2">Best fit</div>
                <div className="text-bone leading-relaxed">
                  Mid-market manufacturers ($25M–$1B revenue) with a real ERP and a plant director who wakes up thinking about commodity volatility.
                </div>
              </div>
            </div>
          </div>

          {/* Right column — form */}
          <div className="md:col-span-7 md:pl-6">
            {submitted ? (
              <div className="border hair bg-panel p-12" data-testid="confirmation-card">
                <div className="w-2 h-2 bg-signal mb-6"></div>
                <h2 className="text-3xl display mb-4">Thanks — we've got it.</h2>
                <p className="text-soft leading-relaxed max-w-md mb-8">
                  Your note is in our inbox. Expect a reply from a real person (Austin, probably) within one business day. If it's urgent, email{" "}
                  <a href={`mailto:${SALES_EMAIL}`} className="text-bone hover:text-signal transition">
                    {SALES_EMAIL}
                  </a>
                  {" "}directly.
                </p>
                <button
                  onClick={() => setLocation("/")}
                  className="btn-ghost text-xs px-4 py-2 uppercase tracking-[0.14em]"
                  data-testid="button-back-home"
                >
                  Back to home
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="border hair bg-panel p-10 space-y-6" data-testid="form-contact-sales">
                {/* Honeypot — visually hidden, tab-stop disabled. Real users never see this.
                    Bots that blindly fill every field will populate it and get silently dropped
                    server-side. aria-hidden keeps screen readers from announcing it. */}
                <div
                  aria-hidden="true"
                  style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}
                >
                  <label htmlFor="website">Leave this field empty</label>
                  <input
                    id="website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={update("website")}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="eyebrow block mb-2" htmlFor="name">Your name *</label>
                    <input
                      id="name"
                      value={form.name}
                      onChange={update("name")}
                      required
                      maxLength={200}
                      autoComplete="name"
                      className="w-full bg-ink border hair px-3 py-2.5 text-sm text-bone focus:border-signal outline-none transition"
                      data-testid="input-name"
                    />
                  </div>
                  <div>
                    <label className="eyebrow block mb-2" htmlFor="email">Work email *</label>
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={update("email")}
                      required
                      maxLength={200}
                      autoComplete="email"
                      className="w-full bg-ink border hair px-3 py-2.5 text-sm text-bone focus:border-signal outline-none transition"
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="eyebrow block mb-2" htmlFor="company">Company</label>
                    <input
                      id="company"
                      value={form.company}
                      onChange={update("company")}
                      maxLength={200}
                      autoComplete="organization"
                      className="w-full bg-ink border hair px-3 py-2.5 text-sm text-bone focus:border-signal outline-none transition"
                      data-testid="input-company"
                    />
                  </div>
                  <div>
                    <label className="eyebrow block mb-2" htmlFor="role">Your role</label>
                    <input
                      id="role"
                      placeholder="e.g. Director of Operations"
                      value={form.role}
                      onChange={update("role")}
                      maxLength={200}
                      autoComplete="organization-title"
                      className="w-full bg-ink border hair px-3 py-2.5 text-sm text-bone focus:border-signal outline-none transition placeholder:text-muted"
                      data-testid="input-role"
                    />
                  </div>
                </div>

                <div>
                  <label className="eyebrow block mb-2" htmlFor="topic">What do you want to talk about?</label>
                  <select
                    id="topic"
                    value={form.topic}
                    onChange={update("topic")}
                    className="w-full bg-ink border hair px-3 py-2.5 text-sm text-bone focus:border-signal outline-none transition"
                    data-testid="select-topic"
                  >
                    <option value="demo">Book a demo</option>
                    <option value="pilot">Pilot program (90-day paid pilot)</option>
                    <option value="enterprise">Enterprise / Tenant VPC deployment</option>
                    <option value="integration">Custom integration</option>
                    <option value="security">Security / compliance questionnaire</option>
                    <option value="press">Press or analyst inquiry</option>
                    <option value="other">Something else</option>
                  </select>
                </div>

                <div>
                  <label className="eyebrow block mb-2" htmlFor="message">What should we know? *</label>
                  <textarea
                    id="message"
                    rows={5}
                    value={form.message}
                    onChange={update("message")}
                    required
                    maxLength={5000}
                    placeholder="What you make, rough revenue range, what's broken about your current forecasting/procurement, and anything else that would help us come back with a useful answer."
                    className="w-full bg-ink border hair px-3 py-2.5 text-sm text-bone focus:border-signal outline-none transition placeholder:text-muted resize-y"
                    data-testid="textarea-message"
                  />
                  <div className="mono text-xs text-muted mt-1 text-right">
                    {form.message.length}/5000
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t hair">
                  <div className="mono text-xs text-muted">
                    We'll reply within one US business day.
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary text-sm px-5 py-2.5 disabled:opacity-50"
                    data-testid="button-submit"
                  >
                    {submitting ? "Sending…" : "Send message"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-10 py-14 border-t hair flex items-center justify-between text-sm text-muted relative z-10 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-signal"></div>
          <span className="tracking-[0.18em] font-medium">PRESCIENT LABS</span>
        </div>
        <nav className="flex items-center gap-6 text-xs">
          <a href="/pricing" className="hover:text-bone transition">Pricing</a>
          <a href="/security" className="hover:text-bone transition">Security</a>
          <a href="/trust" className="hover:text-bone transition">Trust</a>
          <a href="/status" className="hover:text-bone transition">Status</a>
          <a href="/contact" className="hover:text-bone transition">Contact</a>
          <a href="/terms" className="hover:text-bone transition">Terms</a>
          <a href="/privacy" className="hover:text-bone transition">Privacy</a>
        </nav>
        <div className="mono text-xs">© 2026</div>
      </footer>
    </div>
  );
}
