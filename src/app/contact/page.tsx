"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Brain,
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
import { SiteFooter } from "@/components/SiteFooter";

const contactTypes = [
  { id: "general", label: "General Question", icon: MessageSquare },
  { id: "bug", label: "Bug Report", icon: Bug },
  { id: "feature", label: "Feature Request", icon: Lightbulb },
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
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-poppins)" }}>
            Ticket Registered!
          </h2>
          <p className="text-gray-600 mb-6">
            Thanks for reaching out. We have successfully registered your support request as ticket <strong>#TKT-{ticketNumber}</strong>. We&apos;ll get back to you at <strong>{formData.email}</strong> within 24 hours on weekdays.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
              Back to Home
            </Link>
            <Link href="/support/tickets" className="inline-flex items-center gap-2 bg-white text-gray-700 font-medium px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
              Go to Support Tickets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900" style={{ fontFamily: "var(--font-poppins)" }}>
              Get<span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">Ahead</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">Sign In</Link>
            <Link href="/signup" className="text-sm bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-slate-50 via-blue-50/40 to-teal-50/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-poppins)" }}>
              Get in touch
            </h1>
            <p className="text-xl text-gray-600 max-w-xl mx-auto">
              We read every message. Whether it&apos;s a question, bug, or feature idea — we&apos;d love to hear from you.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-10">
            {/* Info sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Email us</h3>
                <a href="mailto:support@getahead.ai" className="text-blue-600 text-sm hover:underline">support@getahead.ai</a>
                <p className="text-xs text-gray-500 mt-2">For all general, technical, and account queries.</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Response time</h3>
                <p className="text-sm text-gray-700">Within 24 hours</p>
                <p className="text-xs text-gray-500 mt-1">Monday – Friday, 9am – 6pm IST. Weekends may be slower.</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Common requests</h3>
                <ul className="space-y-1.5 text-sm text-gray-600">
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
                <p className="text-xs text-blue-700 mb-3">Check the Help Center — most questions are answered there instantly.</p>
                <Link href="/help" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline">
                  Browse Help Center <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Contact form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6" style={{ fontFamily: "var(--font-poppins)" }}>
                  Send us a message
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Contact type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3" id="contact-type-label">
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
                                : "border-gray-200 text-gray-600 hover:border-gray-300"
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
                      <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Full Name
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
                      <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email Address
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
                    <label htmlFor="contact-subject" className="block text-sm font-medium text-gray-700 mb-1.5">
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
                    <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-1.5">
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
                      Something went wrong. Please try again or email us directly at support@getahead.ai
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="w-full bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {status === "submitting" ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                    ) : (
                      <><Send className="w-4 h-4" /> Send Message</>
                    )}
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    By submitting this form, you agree to our{" "}
                    <Link href="/privacy" className="text-blue-500 hover:underline">Privacy Policy</Link>.
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
