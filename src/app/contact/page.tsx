"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Mail,
  Clock,
  MessageSquare,
  Bug,
  Lightbulb,
  CheckCircle,
  ArrowRight,
  ChevronRight,
  Send,
  Loader2,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SupportResponseNote } from "@/components/SupportResponseNote";

const contactTypes = [
  { id: "general", label: "General question", icon: MessageSquare },
  { id: "bug", label: "Bug report", icon: Bug },
  { id: "feature", label: "Feature request", icon: Lightbulb },
  { id: "other", label: "Other", icon: Mail },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    type: "general",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          category: formData.type,
          subject: formData.subject,
          message: formData.message,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTicketNumber(data.ticketNumber);
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Ticket registered!
          </h2>
          <p className="text-graphite mb-2">
            Thanks for reaching out. We have successfully registered your support request as ticket <strong>#TKT-{ticketNumber}</strong>. We&apos;ll get back to you at <strong>{formData.email}</strong>.
          </p>
          <SupportResponseNote className="text-graphite mb-6 text-sm" />
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="inline-flex items-center gap-2 bg-ink text-paper font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
              Back to home
            </Link>
            <Link href="/support/tickets" className="inline-flex items-center gap-2 bg-surface text-ink font-medium px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
              Go to support tickets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Navbar */}
      <SiteHeader />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-paper">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Get in touch
            </h1>
            <p className="text-xl text-graphite max-w-xl mx-auto">
              We read every message. Whether it&apos;s a question, bug, or feature idea — we&apos;d love to hear from you.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-10">
            {/* Info sidebar */}
            <div className="space-y-6">
              <div className="bg-surface rounded-2xl border border-rule shadow-sm p-6">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Send us a message</h3>
                <a href="#contact-form" className="text-blue-600 text-sm hover:underline">Use the form below</a>
                <p className="text-xs text-graphite mt-2">For all general, technical, and account queries — we don&apos;t currently support email.</p>
              </div>

              <div className="bg-surface rounded-2xl border border-rule shadow-sm p-6">
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Response time</h3>
                <SupportResponseNote className="text-sm text-ink" />
                <p className="text-xs text-graphite mt-1">Monday – Friday, 9am – 6pm IST. Weekends may be slower.</p>
              </div>

              <div className="bg-surface rounded-2xl border border-rule shadow-sm p-6">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Common requests</h3>
                <ul className="space-y-1.5 text-sm text-graphite">
                  {["Account issues", "Reset password help", "Upload problems", "Evaluation accuracy", "Feature requests", "Report a bug"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
                <p className="text-sm font-semibold text-blue-800 mb-1">Before contacting support</p>
                <p className="text-xs text-blue-700 mb-3">Check the help center — most questions are answered there instantly.</p>
                <Link href="/help" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline">
                  Browse help center <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Contact form */}
            <div id="contact-form" className="lg:col-span-2">
              <div className="bg-surface rounded-2xl border border-rule shadow-sm p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6" style={{ fontFamily: "var(--font-display)" }}>
                  Send us a message
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Contact type */}
                  <div>
                    <label className="block text-sm font-medium text-ink mb-3" id="contact-type-label">
                      I want to…
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-labelledby="contact-type-label">
                      {contactTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, type: type.id }))}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all ${
                              formData.type === type.id
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-gray-200 text-graphite hover:border-gray-300"
                            }`}
                            aria-pressed={formData.type === type.id}
                          >
                            <Icon className="w-4 h-4" />
                            {type.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="contact-name" className="block text-sm font-medium text-ink mb-1.5">
                        Full name
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="Your name"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="block text-sm font-medium text-ink mb-1.5">
                        Email address
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-subject" className="block text-sm font-medium text-ink mb-1.5">
                      Subject
                    </label>
                    <input
                      id="contact-subject"
                      name="subject"
                      type="text"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      placeholder="Brief description of your query"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="block text-sm font-medium text-ink mb-1.5">
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      required
                      placeholder={
                        formData.type === "bug"
                          ? "Please describe: what you were doing, what you expected, and what happened. Include error messages if any."
                          : formData.type === "feature"
                          ? "Describe the feature you'd like to see. Who would use it and why would it be helpful?"
                          : "How can we help you?"
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                    />
                  </div>

                  {status === "error" && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm" role="alert">
                      Your message didn&apos;t send. Please try again in a moment.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="w-full bg-ink text-paper font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {status === "submitting" ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                    ) : (
                      <><Send className="w-4 h-4" /> Send message</>
                    )}
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    By submitting this form, you agree to our{" "}
                    <Link href="/privacy" className="text-blue-500 hover:underline">privacy policy</Link>.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
