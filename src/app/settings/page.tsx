"use client";

import { useSession } from "next-auth/react";
import { User, Bell, Shield, CreditCard, Palette, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

const sections = [
  { id: "profile", icon: User, label: "Profile" },
  { id: "notifications", icon: Bell, label: "Notifications" },
  { id: "security", icon: Shield, label: "Security" },
  { id: "subscription", icon: CreditCard, label: "Subscription" },
  { id: "appearance", icon: Palette, label: "Appearance" },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState("profile");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-poppins)" }}>
          Settings
        </h1>
        <p className="text-gray-500 text-sm">Manage your account preferences</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar nav */}
        <div className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-3 h-fit">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeSection === s.id
                  ? "gradient-primary text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <s.icon className="w-4 h-4" />
                {s.label}
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 card-shadow-md p-6">
          {activeSection === "profile" && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-6" style={{ fontFamily: "var(--font-poppins)" }}>
                Profile Information
              </h2>

              {/* Avatar */}
              <div className="flex items-center gap-5 mb-8">
                <div className="w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                  {session?.user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{session?.user?.name}</p>
                  <p className="text-gray-500 text-sm">{session?.user?.email}</p>
                  <button className="text-blue-600 text-xs font-medium mt-1.5 hover:underline">
                    Change photo
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                {[
                  { label: "Full Name", value: session?.user?.name || "", id: "settings-name" },
                  { label: "Email Address", value: session?.user?.email || "", id: "settings-email" },
                  { label: "Role", value: "Student", id: "settings-role" },
                  { label: "Institution", value: "N/A", id: "settings-institution" },
                ].map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {field.label}
                    </label>
                    <input
                      id={field.id}
                      type="text"
                      defaultValue={field.value}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  id="save-settings"
                  onClick={handleSave}
                  className="gradient-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
                >
                  {saved ? "✓ Saved!" : "Save Changes"}
                </button>
                <button className="border border-gray-200 text-gray-600 font-medium px-6 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {activeSection === "subscription" && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-6" style={{ fontFamily: "var(--font-poppins)" }}>
                Subscription & Credits
              </h2>

              <div className="bg-gradient-to-r from-blue-600 to-teal-500 rounded-2xl p-6 text-white mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium mb-1">Current Plan</p>
                    <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-poppins)" }}>
                      FREE
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-100 text-sm">Credits Used</p>
                    <p className="text-2xl font-bold">0/10</p>
                  </div>
                </div>
                <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full w-0 bg-white rounded-full" />
                </div>
                <p className="text-blue-100 text-xs mt-2">10 evaluations remaining</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { name: "Pro", price: "₹299/mo", features: "100 evaluations + Advanced analytics", color: "bg-blue-50 border-blue-200" },
                  { name: "Premium", price: "₹4,999/mo", features: "Unlimited + Batch processing + API", color: "bg-purple-50 border-purple-200" },
                ].map((plan) => (
                  <div key={plan.name} className={`rounded-2xl border-2 ${plan.color} p-5`}>
                    <p className="font-bold text-gray-900 text-lg mb-1">{plan.name}</p>
                    <p className="text-blue-700 font-semibold text-xl mb-2">{plan.price}</p>
                    <p className="text-gray-600 text-xs mb-4">{plan.features}</p>
                    <button className="w-full gradient-primary text-white text-sm font-semibold py-2 rounded-xl hover:opacity-90 transition-opacity">
                      Upgrade
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "appearance" && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--font-poppins)" }}>
                Appearance & Theme
              </h2>
              <p className="text-gray-500 text-xs mb-6">
                Choose a visual theme that suits your style and workspace needs.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    id: "default" as const,
                    name: "Classic Blue (Default)",
                    description: "Standard light theme with blue and teal highlights.",
                    previewBg: "bg-[#f8fafc]",
                    previewColors: ["bg-[#2563eb]", "bg-[#14b8a6]"],
                  },
                  {
                    id: "dark" as const,
                    name: "Slate Dark",
                    description: "Relaxing dark layout with purple and pink accents.",
                    previewBg: "bg-[#0f172a]",
                    previewColors: ["bg-[#8b5cf6]", "bg-[#ec4899]"],
                  },
                  {
                    id: "emerald" as const,
                    name: "Emerald Forest",
                    description: "Crisp green theme with deep blue accents.",
                    previewBg: "bg-[#f9fafb]",
                    previewColors: ["bg-[#059669]", "bg-[#2563eb]"],
                  },
                  {
                    id: "sunset" as const,
                    name: "Sunset Glow",
                    description: "Warm layout with orange and magenta highlights.",
                    previewBg: "bg-[#fafafa]",
                    previewColors: ["bg-[#f97316]", "bg-[#db2777]"],
                  },
                ].map((t) => {
                  const isActive = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`flex flex-col text-left p-5 rounded-2xl border-2 transition-all hover:scale-[1.01] ${
                        isActive
                          ? "border-blue-600 bg-blue-50/20"
                          : "border-gray-100 hover:border-gray-200 bg-white"
                      }`}
                    >
                      {/* Preview Box */}
                      <div className={`w-full h-24 rounded-xl ${t.previewBg} border border-gray-150 p-3 mb-4 flex items-center justify-between shadow-inner`}>
                        <div className="space-y-1.5 flex-1">
                          <div className={`h-2.5 w-16 rounded-full opacity-60 ${t.id === "dark" ? "bg-slate-700" : "bg-gray-200"}`} />
                          <div className={`h-2.5 w-24 rounded-full opacity-60 ${t.id === "dark" ? "bg-slate-700" : "bg-gray-200"}`} />
                        </div>
                        <div className="flex gap-1.5">
                          {t.previewColors.map((colorClass, idx) => (
                            <div key={idx} className={`w-6 h-6 rounded-full shadow ${colorClass}`} />
                          ))}
                        </div>
                      </div>

                      <p className="font-bold text-gray-900 text-sm mb-1">{t.name}</p>
                      <p className="text-gray-500 text-xs">{t.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection !== "profile" && activeSection !== "subscription" && activeSection !== "appearance" && (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                {(() => {
                  const sec = sections.find((s) => s.id === activeSection);
                  const Icon = sec?.icon || User;
                  return <Icon className="w-7 h-7 text-gray-400" />;
                })()}
              </div>
              <p className="text-gray-500 font-medium capitalize">{activeSection} settings</p>
              <p className="text-gray-400 text-sm mt-1">Coming soon — we&apos;re building this out!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
