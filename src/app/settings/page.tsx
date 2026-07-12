"use client";

import { useSession } from "next-auth/react";
import { User, Bell, Shield, Palette, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

const sections = [
  { id: "profile", icon: User, label: "Profile" },
  { id: "notifications", icon: Bell, label: "Notifications" },
  { id: "security", icon: Shield, label: "Security" },
  { id: "appearance", icon: Palette, label: "Appearance" },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState("profile");
  const [saved, setSaved] = useState(false);

  // Security password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notifications state
  const [evalEmail, setEvalEmail] = useState(true);
  const [featureEmail, setFeatureEmail] = useState(true);
  const [weeklyEmail, setWeeklyEmail] = useState(false);
  const [pushNotif, setPushNotif] = useState(true);
  const [notificationsSaved, setNotificationsSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Failed to update password");
      } else {
        setPasswordSuccess("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordError("An unexpected error occurred");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleNotificationsSave = () => {
    setNotificationsSaved(true);
    setTimeout(() => setNotificationsSaved(false), 2000);
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

          {activeSection === "notifications" && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--font-poppins)" }}>
                Notification Preferences
              </h2>
              <p className="text-gray-500 text-xs mb-6">
                Choose how and when you receive system and performance updates.
              </p>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Email Notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={evalEmail}
                        onChange={(e) => setEvalEmail(e.target.checked)}
                        className="w-4.5 h-4.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Evaluation Completion</p>
                        <p className="text-xs text-gray-500">Notify me as soon as an uploaded answer sheet is graded.</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={featureEmail}
                        onChange={(e) => setFeatureEmail(e.target.checked)}
                        className="w-4.5 h-4.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Feature Updates</p>
                        <p className="text-xs text-gray-500">Keep me updated on newly supported built-in subjects and features.</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={weeklyEmail}
                        onChange={(e) => setWeeklyEmail(e.target.checked)}
                        className="w-4.5 h-4.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Weekly Progress</p>
                        <p className="text-xs text-gray-500">Receive a weekly digest of evaluation accuracy and scores.</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-4">
                  <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Browser Notifications</h3>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pushNotif}
                      onChange={(e) => setPushNotif(e.target.checked)}
                      className="w-4.5 h-4.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Push Notifications</p>
                      <p className="text-xs text-gray-500">Display real-time evaluation status alerts inside your browser window.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <button
                  onClick={handleNotificationsSave}
                  className="gradient-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
                >
                  {notificationsSaved ? "✓ Preferences Saved!" : "Save Preferences"}
                </button>
              </div>
            </div>
          )}

          {activeSection === "security" && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: "var(--font-poppins)" }}>
                Security Settings
              </h2>
              <p className="text-gray-500 text-xs mb-6">
                Update your account password and configure security options.
              </p>

              {passwordError && (
                <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="mb-4 p-3.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium">
                  {passwordSuccess}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="At least 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="At least 6 characters"
                  />
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="gradient-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
                  >
                    {passwordLoading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
