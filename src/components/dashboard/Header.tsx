"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, Plus, Search, Settings, LogOut } from "lucide-react";

interface UserProfile {
  name: string;
  email: string;
  role: string;
  plan: string;
  credits: number;
  usedCredits: number;
}

export function DashboardHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session) {
      fetch("/api/user/profile")
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.profile) {
            setProfile(d.profile);
          }
        })
        .catch(() => {});
    }
  }, [session]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-surface border-b border-rule px-6 py-4 flex items-center justify-between gap-4 z-20">
      <div>
        {title ? (
          <>
            <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
              {title}
            </h1>
            {subtitle && <p className="text-sm text-graphite">{subtitle}</p>}
          </>
        ) : (
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search evaluations..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 w-64 transition-all"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/upload"
          className="hidden sm:inline-flex items-center gap-2 bg-ink text-paper text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New evaluation
        </Link>

        <button className="relative w-9 h-9 bg-gray-50 hover:bg-surface-2 rounded-xl flex items-center justify-center transition-colors">
          <Bell className="w-4 h-4 text-graphite" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
        </button>

        {/* Dropdown Container */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-9 h-9 rounded-xl bg-fixed-ink flex items-center justify-center text-white text-sm font-bold shadow-sm hover:opacity-95 transition-opacity"
            title="User profile menu"
          >
            {session?.user?.name?.[0]?.toUpperCase() || "U"}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-surface border border-rule rounded-2xl shadow-xl py-2 z-50 animate-fade-in text-ink">
              <div className="px-4 py-2.5 border-b border-rule">
                <p className="font-bold text-gray-900 truncate" style={{ fontFamily: "var(--font-display)" }}>
                  {profile?.name || session?.user?.name}
                </p>
                <p className="text-xs text-graphite truncate mt-0.5">
                  {profile?.email || session?.user?.email}
                </p>
              </div>

              {/* Role Info */}
              <div className="px-4 py-2.5 bg-gray-50 border-b border-rule">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-graphite uppercase tracking-wide">Role</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold text-xxs uppercase tracking-wider">
                    {profile?.role || "STUDENT"}
                  </span>
                </div>
              </div>

              <div className="p-1.5 space-y-0.5">
                <Link
                  href="/settings"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 text-ink hover:text-ink transition-colors w-full"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                  Settings
                </Link>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-red-50 text-ink hover:text-red-600 transition-colors w-full text-left"
                >
                  <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
