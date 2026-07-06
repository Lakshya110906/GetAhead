"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Bell, Plus, Search } from "lucide-react";
import { ThemeSlider } from "@/components/ThemeSlider";

export function DashboardHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { data: session } = useSession();

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between gap-4">
      <div>
        {title ? (
          <>
            <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--font-poppins)" }}>
              {title}
            </h1>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
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
        <ThemeSlider />

        <Link
          href="/upload"
          className="hidden sm:inline-flex items-center gap-2 gradient-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Evaluation
        </Link>

        <button className="relative w-9 h-9 bg-gray-50 hover:bg-gray-100 rounded-xl flex items-center justify-center transition-colors">
          <Bell className="w-4 h-4 text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
        </button>

        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-white text-sm font-bold">
          {session?.user?.name?.[0]?.toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
}
