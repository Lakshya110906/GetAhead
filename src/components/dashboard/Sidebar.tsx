"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Brain,
  LayoutDashboard,
  Upload,
  BarChart3,
  BookMarked,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Menu,
  X,
} from "lucide-react";
import { ThemeSlider } from "@/components/ThemeSlider";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/upload", icon: Upload, label: "New Evaluation" },
  { href: "/generate-paper", icon: GraduationCap, label: "Generate Paper" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/saved-reports", icon: BookMarked, label: "Saved Reports" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

// ── Theme Pill Toggle ──────────────────────────────────────────────────────
function ThemePill() {
  return (
    <div className="px-3 py-2 mb-1">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Theme</span>
      </div>
      <ThemeSlider compact />
    </div>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderSidebarContent = () => (
    <>
      {/* Logo */}
      <Link
        href="/"
        className={`flex items-center gap-3 px-4 py-5 border-b border-gray-100 ${collapsed ? "justify-center" : ""} hover:opacity-90 transition-opacity`}
      >
        <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
          <Brain className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-gray-900 text-sm" style={{ fontFamily: "var(--font-poppins)" }}>
            Get<span className="text-gradient">Ahead</span>
          </span>
        )}
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? "gradient-primary text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"}`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-gray-100 p-3 pb-16">
        {!collapsed && session?.user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {session.user.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{session.user.name}</p>
              <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
            </div>
          </div>
        )}

        {/* Theme Switcher Pill */}
        {!collapsed && <ThemePill />}

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors mt-1 ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 bg-white border-r border-gray-100 card-shadow transition-all duration-300 z-30 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {renderSidebarContent()}

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-gray-500" />
          )}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <button
          className="fixed top-4 left-4 z-50 w-9 h-9 bg-white rounded-xl border border-gray-200 flex items-center justify-center shadow-sm"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white z-50 flex flex-col border-r border-gray-100 shadow-2xl">
              {renderSidebarContent()}
            </aside>
          </>
        )}
      </div>

      {/* Spacer for desktop */}
      <div className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`} />
    </>
  );
}
