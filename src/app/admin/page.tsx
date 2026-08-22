/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import {
  Brain,
  Loader2,
  Users,
  Award,
  FileText,
  Clock,
  TrendingUp,
  Activity,
  LogOut,
  Database,
  Search,
  CheckCircle,
  RefreshCw,
  Download,
  Shield,
  Settings,
  ListCollapse,
  LifeBuoy,
  DollarSign,
  AlertTriangle,
  Gauge,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

export default function AdminPage() {
  // Auth itself is enforced server-side by src/app/admin/layout.tsx (session
  // + role check) and independently by requireAdmin() on every /api/admin/*
  // route — reaching this component at all means that already passed.
  // "authenticated" here just tracks whether the initial data load finished.
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState("overview");

  // Admin Data states
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [spend, setSpend] = useState<any>(null);
  const [quota, setQuota] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState("");

  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [evalsTotal, setEvalsTotal] = useState(0);
  const [evalsPage, setEvalsPage] = useState(1);
  const [evalsSearch, setEvalsSearch] = useState("");

  const [papers, setPapers] = useState<any[]>([]);
  const [papersTotal, setPapersTotal] = useState(0);
  const [papersPage, setPapersPage] = useState(1);
  const [papersSearch, setPapersSearch] = useState("");

  const [dbInfo, setDbInfo] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsSearch, setLogsSearch] = useState("");
  const [logType, setLogType] = useState("audit"); // audit or error

  const [sysSettings, setSysSettings] = useState<any>({
    siteName: "GetAhead AI",
    logoUrl: "",
    maintenanceMode: "false",
    defaultTheme: "default",
    maxUploadSize: "10",
    allowedFileTypes: "pdf,jpeg,png",
  });

  // Support Tickets States
  const [ticketStats, setTicketStats] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [ticketsPage, setTicketsPage] = useState(1);
  const [ticketsSearch, setTicketsSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("");
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState("");
  const [ticketCategoryFilter, setTicketCategoryFilter] = useState("");

  // Action helpers
  const [, setActionLoading] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState<string | null>(null);
  const [newResetPassword, setNewResetPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const [paperPreview, setPaperPreview] = useState<any>(null);
  const [dbHealthMessage, setDbHealthMessage] = useState("");

  // Every secondary panel fetch (health, spend, quota, metrics, users,
  // evaluations, papers, db info, logs, settings, tickets) used to swallow
  // its own failure with .catch(() => {}) — a widget that failed to load
  // rendered identically to a widget with genuinely zero data (a "0" stat,
  // an empty table), leaving the admin no way to tell the two apart. Each
  // fetch below now records its own failure by label instead.
  const [loadErrors, setLoadErrors] = useState<Set<string>>(new Set());
  const markLoadError = (label: string) =>
    setLoadErrors((prev) => new Set(prev).add(label));
  const clearLoadError = (label: string) =>
    setLoadErrors((prev) => {
      if (!prev.has(label)) return prev;
      const next = new Set(prev);
      next.delete(label);
      return next;
    });

  // 1. Initial auth check

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setAuthenticated(true);
        // Load secondary states
        fetchHealth();
        fetchSpend();
        fetchQuota();
        fetchMetrics();
        fetchUsers();
        fetchEvaluations();
        fetchPapers();
        fetchDbInfo();
        fetchLogs();
        fetchSettings();
        fetchTicketStats();
        fetchTickets(1, "", "", "", "");
      } else {
        setAuthenticated(false);
      }
    } catch {
      setAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const fetchTicketStats = () => {
    fetch("/api/admin/tickets/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setTicketStats(d.stats); clearLoadError("ticketStats"); }
        else markLoadError("ticketStats");
      })
      .catch(() => markLoadError("ticketStats"));
  };

  const fetchTickets = (
    page = 1,
    search = ticketsSearch,
    status = ticketStatusFilter,
    priority = ticketPriorityFilter,
    category = ticketCategoryFilter
  ) => {
    fetch(
      `/api/admin/tickets?page=${page}&search=${encodeURIComponent(
        search
      )}&status=${status}&priority=${priority}&category=${category}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setTickets(d.tickets || []);
          setTicketsTotal(d.total || 0);
          setTicketsPage(d.page || 1);
          clearLoadError("tickets");
        } else {
          markLoadError("tickets");
        }
      })
      .catch(() => markLoadError("tickets"));
  };

  useEffect(() => {
    if (authenticated && activeTab === "support") {
      fetchTickets(1, ticketsSearch, ticketStatusFilter, ticketPriorityFilter, ticketCategoryFilter);
      fetchTicketStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketsSearch, ticketStatusFilter, ticketPriorityFilter, ticketCategoryFilter, activeTab, authenticated]);

  const handleLogout = async () => {
    // signOut's server-side event handler (see authOptions.events.signOut in
    // src/lib/auth.ts) revokes this session's token in the KV revocation
    // list immediately, on top of clearing the cookie.
    await signOut({ callbackUrl: "/" });
  };

  // Sub-queries
  const fetchHealth = () => {
    fetch("/api/admin/health")
      .then((r) => r.json())
      .then((d) => { setHealth(d); clearLoadError("health"); })
      .catch(() => markLoadError("health"));
  };

  const fetchSpend = () => {
    fetch("/api/admin/spend")
      .then((r) => r.json())
      .then((d) => { setSpend(d); clearLoadError("spend"); })
      .catch(() => markLoadError("spend"));
  };

  const fetchQuota = () => {
    fetch("/api/admin/quota")
      .then((r) => r.json())
      .then((d) => { setQuota(d); clearLoadError("quota"); })
      .catch(() => markLoadError("quota"));
  };

  const fetchMetrics = () => {
    fetch("/api/admin/metrics")
      .then((r) => r.json())
      .then((d) => { setMetrics(d); clearLoadError("metrics"); })
      .catch(() => markLoadError("metrics"));
  };

  const fetchUsers = (page = 1, search = usersSearch) => {
    fetch(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users || []);
        setUsersTotal(d.total || 0);
        setUsersPage(d.page || 1);
        clearLoadError("users");
      })
      .catch(() => markLoadError("users"));
  };

  const fetchEvaluations = (page = 1, search = evalsSearch) => {
    fetch(`/api/admin/evaluations?page=${page}&search=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((d) => {
        setEvaluations(d.evaluations || []);
        setEvalsTotal(d.total || 0);
        setEvalsPage(d.page || 1);
        clearLoadError("evaluations");
      })
      .catch(() => markLoadError("evaluations"));
  };

  const fetchPapers = (page = 1, search = papersSearch) => {
    fetch(`/api/admin/papers?page=${page}&search=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((d) => {
        setPapers(d.papers || []);
        setPapersTotal(d.total || 0);
        setPapersPage(d.page || 1);
        clearLoadError("papers");
      })
      .catch(() => markLoadError("papers"));
  };

  const fetchDbInfo = () => {
    fetch("/api/admin/db")
      .then((r) => r.json())
      .then((d) => { setDbInfo(d); clearLoadError("dbInfo"); })
      .catch(() => markLoadError("dbInfo"));
  };

  const fetchLogs = (page = 1, type = logType, search = logsSearch) => {
    fetch(`/api/admin/logs?page=${page}&type=${type}&search=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.logs || []);
        setLogsTotal(d.total || 0);
        setLogsPage(d.page || 1);
        clearLoadError("logs");
      })
      .catch(() => markLoadError("logs"));
  };

  const fetchSettings = () => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => { setSysSettings(d); clearLoadError("settings"); })
      .catch(() => markLoadError("settings"));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStats();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actions
  const handleUserAction = async (userId: string, action: string, extra = {}) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, ...extra }),
      });
      if (res.ok) {
        fetchUsers(usersPage);
        fetchStats();
      } else {
        const d = await res.json();
        alert(d.error || "Action failed");
      }
    } catch {
      alert("Failed connecting to API");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEvaluationDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this evaluation?")) return;
    try {
      const res = await fetch("/api/admin/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (res.ok) {
        fetchEvaluations(evalsPage);
        fetchStats();
      } else {
        const d = await res.json();
        alert(d.error || "Delete failed");
      }
    } catch {
      alert("Failed connecting to API");
    }
  };

  const handlePaperDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question paper?")) return;
    try {
      const res = await fetch("/api/admin/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (res.ok) {
        fetchPapers(papersPage);
        fetchStats();
      } else {
        const d = await res.json();
        alert(d.error || "Delete failed");
      }
    } catch {
      alert("Failed connecting to API");
    }
  };

  const triggerDbAction = async (action: string) => {
    setDbHealthMessage("");
    try {
      const res = await fetch("/api/admin/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (action === "health-check") {
        setDbHealthMessage(data.message || "DB Responsive!");
      } else if (action === "export") {
        // Trigger download of json
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `exameval_backup_${Date.now()}.json`;
        a.click();
      }
    } catch {
      alert("DB Action failed");
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sysSettings),
      });
      if (res.ok) {
        alert("Settings saved successfully!");
        fetchSettings();
      }
    } catch {
      alert("Settings didn't save. Check your connection and try again.");
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-graphite text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // `authenticated` was set but never actually read past this point — the
  // dashboard shell rendered unconditionally after the spinner, so a failed
  // /api/admin/stats call (session revoked mid-session, transient DB error)
  // showed the full admin UI with every panel silently empty instead of
  // telling the admin their session/request failed.
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm px-6">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-ink font-semibold mb-1">Couldn&apos;t load the admin dashboard</p>
          <p className="text-graphite text-sm mb-5">Your session may have expired, or the request failed. Try refreshing, or sign in again.</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 bg-ink text-paper font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  // 3. Render Admin Layout & Dashboard
  return (
    <div className="min-h-screen bg-gray-50 text-ink flex flex-col">
      {/* Header */}
      <header className="bg-surface border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-base" style={{ fontFamily: "var(--font-display)" }}>
              Admin panel
            </h1>
            <p className="text-graphite text-xxs leading-none mt-0.5">GetAhead AI management system</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-graphite hover:text-red-600 bg-gray-50 hover:bg-red-50/50 px-3.5 py-2 rounded-lg border border-rule transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </header>

      {loadErrors.size > 0 && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 text-xs px-6 py-2 flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          Couldn&apos;t load: {Array.from(loadErrors).join(", ")}. Some panels may show stale or empty data — try refreshing.
        </div>
      )}

      {/* Workspace container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <nav className="w-64 bg-surface border-r border-gray-200 p-4 space-y-1.5 shrink-0 overflow-y-auto">
          {[
            { id: "overview", label: "Overview", icon: Activity },
            { id: "metrics", label: "Metrics", icon: Gauge },
            { id: "users", label: "User Management", icon: Users },
            { id: "evaluations", label: "Evaluations", icon: Award },
            { id: "papers", label: "Question Papers", icon: FileText },
            { id: "support", label: "Support Tickets", icon: LifeBuoy, badge: ticketStats?.statusCounts?.NEW },
            { id: "database", label: "Database Panel", icon: Database },
            { id: "health", label: "System Health", icon: Clock },
            { id: "logs", label: "System Logs", icon: ListCollapse },
            { id: "settings", label: "System Settings", icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active ? "bg-blue-600 text-white shadow-md shadow-blue-500/25" : "text-graphite hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Content View Panel */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && stats && (
            <div className="space-y-6 animate-fadeIn">
              {/* Overview grid cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { title: "Total users", val: stats.overview.totalUsers, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                  { title: "Total evaluations", val: stats.overview.totalEvaluations, icon: Award, color: "text-green-600", bg: "bg-green-50" },
                  { title: "Question papers", val: stats.overview.totalQuestionPapers, icon: FileText, color: "text-purple-600", bg: "bg-purple-50" },
                  { title: "Active sessions", val: stats.overview.activeSessionsCount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                  { title: "Logins today", val: stats.overview.loginsToday, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
                  { title: "AI requests today", val: stats.overview.aiRequestsToday, icon: Brain, color: "text-pink-600", bg: "bg-pink-50" },
                  { title: "Success rate", val: `${stats.overview.successRate}%`, icon: CheckCircle, color: "text-teal-600", bg: "bg-teal-50" },
                  { title: "Avg. eval speed", val: stats.overview.avgEvalTime !== null ? `${stats.overview.avgEvalTime}s` : "Not enough data", icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
                ].map((card, i) => (
                  <div key={i} className="bg-surface rounded-2xl border border-rule card-shadow-md p-5 hover:card-shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-graphite font-semibold">{card.title}</p>
                      <div className={`w-9 h-9 ${card.bg} rounded-xl flex items-center justify-center`}>
                        <card.icon className={`w-4.5 h-4.5 ${card.color}`} />
                      </div>
                    </div>
                    <p className="text-3xl font-extrabold text-gray-900 font-mono" style={{ fontFamily: "var(--font-display)" }}>
                      {card.val}
                    </p>
                  </div>
                ))}
              </div>

              {/* Today's spend — see it here, without opening the Google console */}
              {spend && (
                <div
                  className={`rounded-2xl border p-5 flex items-center justify-between gap-4 ${
                    spend.killSwitchActive
                      ? "bg-red-50 border-red-200"
                      : spend.estimatedUsd >= spend.thresholdUsd * 0.5
                      ? "bg-amber-50 border-amber-200"
                      : "bg-surface border-rule card-shadow-md"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        spend.killSwitchActive ? "bg-red-100" : spend.estimatedUsd >= spend.thresholdUsd * 0.5 ? "bg-amber-100" : "bg-green-50"
                      }`}
                    >
                      {spend.killSwitchActive ? (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      ) : (
                        <DollarSign className={`w-5 h-5 ${spend.estimatedUsd >= spend.thresholdUsd * 0.5 ? "text-amber-600" : "text-green-600"}`} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        Today&apos;s estimated spend: ${spend.estimatedUsd.toFixed(2)} of ${spend.thresholdUsd}
                      </p>
                      <p className="text-xs text-graphite mt-0.5">
                        {spend.totalTokens.toLocaleString()} tokens across evaluations today ({spend.date}). Estimate only — Google Cloud billing is authoritative.
                      </p>
                    </div>
                  </div>
                  {spend.killSwitchActive && (
                    <span className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1.5 rounded-full whitespace-nowrap">
                      Kill switch active — new jobs paused
                    </span>
                  )}
                </div>
              )}

              {/* Gemini quota, per model — "how much is left today?" at a glance.
                  warn >=80%, block >=95% (new operations are refused server-side
                  at that point, not just visually flagged here). */}
              {quota?.models && (
                <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-5">
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-graphite" />
                    Gemini quota today
                  </h2>
                  <div className="space-y-3">
                    {quota.models.map((m: any) => (
                      <div key={m.model} className="flex items-center gap-4">
                        <div className="w-44 shrink-0">
                          <p className="text-sm font-semibold text-gray-900">{m.model}</p>
                          {!m.confirmed && <p className="text-[10px] text-graphite">limit is an estimate</p>}
                        </div>
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              m.level === "block" ? "bg-red-500" : m.level === "warn" ? "bg-amber-500" : "bg-green-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.round(m.fractionUsed * 100))}%` }}
                          />
                        </div>
                        <div className="w-40 shrink-0 text-right">
                          <span
                            className={`text-sm font-bold font-mono ${
                              m.level === "block" ? "text-red-600" : m.level === "warn" ? "text-amber-600" : "text-gray-900"
                            }`}
                          >
                            {m.used}/{m.limit}
                          </span>
                          <span className="text-xs text-graphite ml-1">({m.remaining} left)</span>
                        </div>
                        {m.level !== "ok" && (
                          <span
                            className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${
                              m.level === "block" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {m.level === "block" ? "new ops blocked" : "80%+ used"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-graphite mt-4">
                    Resets at {quota.models[0] ? new Date(quota.models[0].resetsAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"} (midnight Pacific Time).
                  </p>
                </div>
              )}

              {/* Charts Row */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Evaluations trend */}
                <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6">
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-5">Evaluations (last 7 days)</h2>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.charts.evalsPerDay}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="evaluations" stroke="var(--ink)" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* New users trend */}
                <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6">
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-5">New users (last 7 days)</h2>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.charts.usersOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="users" fill="var(--tick)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: METRICS — the weekly-check page. Every number here is
              actionable; nothing here is a vanity stat. */}
          {activeTab === "metrics" && (
            <div className="space-y-6 animate-fadeIn">
              {!metrics ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { title: "Enqueued (24h)", val: metrics.enqueued, icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
                      { title: "Succeeded (24h)", val: metrics.succeeded, icon: CheckCircle, color: "text-teal-600", bg: "bg-teal-50" },
                      { title: "Failed (24h)", val: metrics.failed, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
                      {
                        title: "Queue depth (now)",
                        val: metrics.queueDepth,
                        icon: Gauge,
                        color: metrics.queueDepth > 20 ? "text-red-600" : "text-orange-600",
                        bg: metrics.queueDepth > 20 ? "bg-red-50" : "bg-orange-50",
                      },
                    ].map((card, i) => (
                      <div key={i} className="bg-surface rounded-2xl border border-rule card-shadow-md p-5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm text-graphite font-semibold">{card.title}</p>
                          <div className={`w-9 h-9 ${card.bg} rounded-xl flex items-center justify-center`}>
                            <card.icon className={`w-4.5 h-4.5 ${card.color}`} />
                          </div>
                        </div>
                        <p className="text-3xl font-extrabold text-gray-900 font-mono" style={{ fontFamily: "var(--font-display)" }}>
                          {card.val}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6">
                      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                        End-to-end evaluation latency (last {metrics.latencySampleSize} succeeded)
                      </h2>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-graphite font-semibold">p50</p>
                          <p className="text-2xl font-bold text-gray-900">{(metrics.latencyP50Ms / 1000).toFixed(1)}s</p>
                        </div>
                        <div>
                          <p className="text-xs text-graphite font-semibold">p95</p>
                          <p className="text-2xl font-bold text-gray-900">{(metrics.latencyP95Ms / 1000).toFixed(1)}s</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6">
                      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Model error rate by type (24h)</h2>
                      {metrics.errorsByType.length === 0 ? (
                        <p className="text-sm text-graphite">No failed evaluations in the last 24 hours.</p>
                      ) : (
                        <div className="space-y-2">
                          {metrics.errorsByType.map((e: { type: string; count: number }) => (
                            <div key={e.type} className="flex items-center justify-between text-sm">
                              <span className="font-mono text-ink">{e.type}</span>
                              <span className="font-bold text-gray-900">{e.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border p-5 flex items-center gap-4 ${
                      metrics.spend.killSwitchActive
                        ? "bg-red-50 border-red-200"
                        : metrics.spend.estimatedUsd >= metrics.spend.thresholdUsd * 0.5
                        ? "bg-amber-50 border-amber-200"
                        : "bg-surface border-rule card-shadow-md"
                    }`}
                  >
                    <DollarSign className="w-5 h-5 text-graphite" />
                    <p className="text-sm font-bold text-gray-900">
                      Today&apos;s token spend: ${metrics.spend.estimatedUsd.toFixed(2)} of ${metrics.spend.thresholdUsd} ({metrics.spend.totalTokens.toLocaleString()} tokens)
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === "users" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
                  Registered Users
                </h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search name/email..."
                    value={usersSearch}
                    onChange={(e) => {
                      setUsersSearch(e.target.value);
                      fetchUsers(1, e.target.value);
                    }}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all w-60"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="bg-surface rounded-2xl border border-rule shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-rule text-xs font-bold text-graphite uppercase">
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Joined Date</th>
                      <th className="px-6 py-4 text-right">Evaluations</th>
                      <th className="px-6 py-4 text-right">Papers</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule text-sm">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">{u.name}</td>
                        <td className="px-6 py-4 text-graphite">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xxs px-2.5 py-1 rounded-full font-bold uppercase ${
                            u.role === "SUSPENDED" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-graphite">
                          {new Date(u.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-6 py-4 text-right font-mono tabular-nums font-bold text-ink">{u.totalEvaluations}</td>
                        <td className="px-6 py-4 text-right font-mono tabular-nums font-bold text-ink">{u.questionPapersGenerated}</td>
                        <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setPasswordResetUser(u.id);
                              setNewResetPassword("");
                              setResetSuccess(false);
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Reset Pass
                          </button>
                          {u.role === "SUSPENDED" ? (
                            <button
                              onClick={() => handleUserAction(u.id, "activate")}
                              className="text-xs text-green-600 hover:underline"
                            >
                              Activate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUserAction(u.id, "suspend")}
                              className="text-xs text-amber-600 hover:underline"
                            >
                              Suspend
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete user ${u.name}?`)) {
                                handleUserAction(u.id, "delete");
                              }
                            }}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center text-xs text-graphite">
                <p>Total {usersTotal} users</p>
                <div className="flex gap-2">
                  <button
                    disabled={usersPage <= 1}
                    onClick={() => {
                      fetchUsers(usersPage - 1);
                    }}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    disabled={usersPage * 10 >= usersTotal}
                    onClick={() => {
                      fetchUsers(usersPage + 1);
                    }}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>

              {/* Reset Password Modal */}
              {passwordResetUser && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
                  <div className="bg-surface rounded-3xl border border-rule p-6 max-w-sm w-full card-shadow-md space-y-4">
                    <h3 className="font-bold text-gray-900 text-lg">Reset Password</h3>
                    {resetSuccess ? (
                      <p className="text-green-600 text-sm font-semibold">✓ Password updated successfully!</p>
                    ) : (
                      <div className="space-y-3">
                        <input
                          type="password"
                          placeholder="Enter new password"
                          value={newResetPassword}
                          onChange={(e) => setNewResetPassword(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    )}
                    <div className="flex justify-end gap-2 text-sm pt-2">
                      <button
                        onClick={() => setPasswordResetUser(null)}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-graphite hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      {!resetSuccess && (
                        <button
                          onClick={async () => {
                            await handleUserAction(passwordResetUser, "reset-password", { newPassword: newResetPassword });
                            setResetSuccess(true);
                            setTimeout(() => { setPasswordResetUser(null); setResetSuccess(false); }, 1500);
                          }}
                          className="px-4 py-2 bg-ink text-paper rounded-xl font-semibold"
                        >
                          Confirm Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EVALUATIONS */}
          {activeTab === "evaluations" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
                  All Evaluations
                </h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search subject/owner..."
                    value={evalsSearch}
                    onChange={(e) => {
                      setEvalsSearch(e.target.value);
                      fetchEvaluations(1, e.target.value);
                    }}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 w-60"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="bg-surface rounded-2xl border border-rule shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-rule text-xs font-bold text-graphite uppercase">
                      <th className="px-6 py-4">Owner</th>
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4 text-right">Score</th>
                      <th className="px-6 py-4 text-center">Grade</th>
                      <th className="px-6 py-4 text-right">Duration</th>
                      <th className="px-6 py-4">Created Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule text-sm">
                    {evaluations.map((ev) => (
                      <tr key={ev.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {ev.owner} <span className="text-gray-400 text-xs block font-normal">{ev.ownerEmail}</span>
                        </td>
                        <td className="px-6 py-4 text-graphite">{ev.subject}</td>
                        <td className="px-6 py-4 text-right font-mono tabular-nums font-semibold text-ink">{ev.score}</td>
                        <td className="px-6 py-4 text-center font-bold text-ink">{ev.grade || "—"}</td>
                        <td className="px-6 py-4 text-right font-mono tabular-nums text-graphite">{ev.duration}s</td>
                        <td className="px-6 py-4 text-graphite">
                          {new Date(ev.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-6 py-4 text-right space-x-1.5">
                          <Link
                            href={`/evaluation/${ev.id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Open Report
                          </Link>
                          <button
                            onClick={() => handleEvaluationDelete(ev.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center text-xs text-graphite">
                <p>Total {evalsTotal} evaluations</p>
                <div className="flex gap-2">
                  <button
                    disabled={evalsPage <= 1}
                    onClick={() => {
                      fetchEvaluations(evalsPage - 1);
                    }}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    disabled={evalsPage * 10 >= evalsTotal}
                    onClick={() => {
                      fetchEvaluations(evalsPage + 1);
                    }}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: QUESTION PAPERS */}
          {activeTab === "papers" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
                  Generated Question Papers
                </h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search subject/title..."
                    value={papersSearch}
                    onChange={(e) => {
                      setPapersSearch(e.target.value);
                      fetchPapers(1, e.target.value);
                    }}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 w-60"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="bg-surface rounded-2xl border border-rule shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-rule text-xs font-bold text-graphite uppercase">
                      <th className="px-6 py-4">Title</th>
                      <th className="px-6 py-4">Owner</th>
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4">Grade</th>
                      <th className="px-6 py-4">Difficulty</th>
                      <th className="px-6 py-4 text-right">Marks</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule text-sm">
                    {papers.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">{p.title}</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {p.owner} <span className="text-gray-400 text-xs block font-normal">{p.ownerEmail}</span>
                        </td>
                        <td className="px-6 py-4 text-graphite">{p.subject}</td>
                        <td className="px-6 py-4 text-graphite">{p.grade}</td>
                        <td className="px-6 py-4">
                          <span className="text-xxs px-2.5 py-1 rounded-full font-bold uppercase bg-amber-50 text-amber-700">
                            {p.difficulty}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono tabular-nums font-bold text-ink">{p.totalMarks}</td>
                        <td className="px-6 py-4 text-right space-x-1.5">
                          <button
                            onClick={() => setPaperPreview(p)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => handlePaperDelete(p.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center text-xs text-graphite">
                <p>Total {papersTotal} question papers</p>
                <div className="flex gap-2">
                  <button
                    disabled={papersPage <= 1}
                    onClick={() => {
                      fetchPapers(papersPage - 1);
                    }}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    disabled={papersPage * 10 >= papersTotal}
                    onClick={() => {
                      fetchPapers(papersPage + 1);
                    }}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>

              {/* Preview Modal */}
              {paperPreview && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
                  <div className="bg-surface rounded-3xl border border-rule p-6 max-w-2xl w-full card-shadow-md space-y-4 max-h-[80vh] flex flex-col">
                    <h3 className="font-bold text-gray-900 text-lg shrink-0">{paperPreview.title}</h3>
                    <div className="flex-1 overflow-y-auto bg-gray-50 rounded-xl p-4 border border-gray-200 text-xs font-mono whitespace-pre-wrap">
                      {paperPreview.content}
                    </div>
                    <div className="flex justify-end gap-2 text-sm pt-2 shrink-0">
                      <button
                        onClick={() => {
                          const blob = new Blob([paperPreview.content], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${paperPreview.title.replace(/\s+/g, "_")}.txt`;
                          a.click();
                        }}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-graphite hover:bg-gray-50 flex items-center gap-1.5 font-medium"
                      >
                        <Download className="w-4 h-4" /> Download
                      </button>
                      <button
                        onClick={() => setPaperPreview(null)}
                        className="px-4 py-2 bg-ink text-paper rounded-xl font-semibold"
                      >
                        Close Preview
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DATABASE PANEL */}
          {activeTab === "database" && dbInfo && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
                Database Administration
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-graphite font-semibold uppercase tracking-wider">Connected Engine</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{dbInfo.dbName}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                </div>
                <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-graphite font-semibold uppercase tracking-wider">System Migrations</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{dbInfo.migrationCount} migrations</p>
                  </div>
                  <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Table counts grid */}
              <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6">
                <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-wider text-sm">Table Statistics</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {dbInfo.tables.map((tbl: any) => (
                    <div key={tbl.name} className="bg-gray-50 border border-rule rounded-xl p-4 text-center">
                      <p className="text-xs text-graphite font-medium">{tbl.name}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{tbl.count}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => triggerDbAction("health-check")}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center gap-2 shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" /> Run DB Health Check
                </button>
                <button
                  onClick={() => triggerDbAction("export")}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4" /> Export Core Records
                </button>
              </div>

              {dbHealthMessage && (
                <div className="p-3.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium">
                  {dbHealthMessage}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SYSTEM HEALTH */}
          {activeTab === "health" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
                  System Health Metrics
                </h2>
                <button
                  onClick={fetchHealth}
                  className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {health ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Basic Metrics */}
                  <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6 space-y-4">
                    <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Runtime Statistics</h3>
                    <div className="divide-y divide-rule text-sm">
                      <div className="py-2.5 flex justify-between">
                        <span className="text-graphite font-medium">CPU Load Average</span>
                        <span className="font-semibold text-gray-900">{health.cpu}</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span className="text-graphite font-medium">Memory Allocation</span>
                        <span className="font-semibold text-gray-900">{health.memory}</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span className="text-graphite font-medium">API Response Time</span>
                        <span className="font-semibold text-gray-900">{health.responseTime}</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span className="text-graphite font-medium">Build Version</span>
                        <span className="font-semibold text-gray-900">{health.buildVersion}</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span className="text-graphite font-medium">Environment Mode</span>
                        <span className="font-semibold text-gray-900 uppercase">{health.environment}</span>
                      </div>
                    </div>
                  </div>

                  {/* Microservices Status */}
                  <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6 space-y-4">
                    <h3 className="font-bold text-gray-900 uppercase tracking-wider text-xs">Integrations Health</h3>
                    <div className="space-y-3">
                      {[
                        { name: "Prisma Schema Engine", status: health.prismaStatus },
                        { name: "MySQL Database Instance", status: health.databaseStatus },
                        { name: "Google Gemini Generative AI API", status: health.geminiStatus },
                        { name: "Credentials Authentication Manager", status: health.authStatus },
                      ].map((item, idx) => {
                        const isOk = item.status === "HEALTHY" || item.status === "CONNECTED";
                        return (
                          <div key={idx} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-rule">
                            <span className="text-sm font-semibold text-ink">{item.name}</span>
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2.5 h-2.5 rounded-full ${isOk ? "bg-green-500" : "bg-red-500"}`} />
                              <span className={`text-xs font-bold uppercase ${isOk ? "text-green-700" : "text-red-700"}`}>
                                {item.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 bg-surface border border-rule rounded-2xl">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                  <p className="text-graphite text-sm">Gathering CPU & Server metrics...</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: SYSTEM LOGS */}
          {activeTab === "logs" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setLogType("audit");
                      fetchLogs(1, "audit");
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      logType === "audit" ? "bg-blue-600 text-white border-blue-600" : "bg-surface text-graphite border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Audit Logs
                  </button>
                  <button
                    onClick={() => {
                      setLogType("error");
                      fetchLogs(1, "error");
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      logType === "error" ? "bg-red-600 text-white border-red-600" : "bg-surface text-graphite border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    System Errors
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={logsSearch}
                    onChange={(e) => {
                      setLogsSearch(e.target.value);
                      fetchLogs(1, logType, e.target.value);
                    }}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 w-60"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="bg-surface rounded-2xl border border-rule shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-rule text-xs font-bold text-graphite uppercase">
                      <th className="px-6 py-4">Timestamp</th>
                      {logType === "audit" ? (
                        <>
                          <th className="px-6 py-4">Action</th>
                          <th className="px-6 py-4">Details</th>
                          <th className="px-6 py-4">IP Address</th>
                        </>
                      ) : (
                        <>
                          <th className="px-6 py-4">Log Type</th>
                          <th className="px-6 py-4">Error Message</th>
                          <th className="px-6 py-4">Endpoint Path</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule text-xs font-mono">
                    {logs.map((lg) => (
                      <tr key={lg.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-graphite whitespace-nowrap">
                          {new Date(lg.createdAt).toLocaleString("en-IN")}
                        </td>
                        {logType === "audit" ? (
                          <>
                            <td className="px-6 py-4 font-bold text-gray-900">{lg.action}</td>
                            <td className="px-6 py-4 text-graphite">{lg.details}</td>
                            <td className="px-6 py-4 text-graphite">{lg.ip || "N/A"}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4">
                              <span className="text-xxs px-2 py-0.5 rounded font-bold uppercase bg-red-100 text-red-700">
                                {lg.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-red-600 break-all">{lg.message}</td>
                            <td className="px-6 py-4 text-graphite">{lg.path || "N/A"}</td>
                          </>
                        )}
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-gray-400 font-sans">
                          {logsSearch
                            ? (
                              <>
                                No logs match &ldquo;{logsSearch}&rdquo;.{" "}
                                <button
                                  onClick={() => { setLogsSearch(""); fetchLogs(1, logType, ""); }}
                                  className="text-blue-600 font-semibold hover:underline"
                                >
                                  Clear search
                                </button>
                              </>
                            )
                            : "No logs recorded yet for this category."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center text-xs text-graphite">
                <p>Total {logsTotal} records</p>
                <div className="flex gap-2">
                  <button
                    disabled={logsPage <= 1}
                    onClick={() => {
                      fetchLogs(logsPage - 1);
                    }}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    disabled={logsPage * 15 >= logsTotal}
                    onClick={() => {
                      fetchLogs(logsPage + 1);
                    }}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB Support: TICKETS MANAGEMENT */}
          {activeTab === "support" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
                    Support Tickets Center
                  </h2>
                  <p className="text-graphite text-sm">
                    Manage system support requests, bug reports, and customer conversations.
                  </p>
                </div>
                <button
                  onClick={() => {
                    fetchTicketStats();
                    fetchTickets(1);
                  }}
                  className="inline-flex items-center gap-1.5 border border-gray-200 bg-surface text-ink text-xs font-semibold px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Tickets
                </button>
              </div>

              {/* Tickets Stats grid */}
              {ticketStats && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
                  {[
                    { title: "Total Tickets", val: ticketStats.total, icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
                    { title: "Open / In Progress", val: ticketStats.openTickets, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                    { title: "Critical / High Priority", val: (ticketStats.priorityCounts?.CRITICAL || 0) + (ticketStats.priorityCounts?.HIGH || 0), icon: Shield, color: "text-red-600", bg: "bg-red-50" },
                    { title: "Avg Response Time", val: `${ticketStats.avgResponseHours}h`, icon: Clock, color: "text-purple-600", bg: "bg-purple-50" },
                  ].map((card, i) => (
                    <div key={i} className="bg-surface rounded-2xl border border-rule card-shadow-md p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-graphite font-semibold">{card.title}</p>
                        <div className={`w-9 h-9 ${card.bg} rounded-xl flex items-center justify-center`}>
                          <card.icon className={`w-4.5 h-4.5 ${card.color}`} />
                        </div>
                      </div>
                      <p className="text-3xl font-extrabold text-gray-900 font-mono" style={{ fontFamily: "var(--font-display)" }}>
                        {card.val}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Analytics and category charts */}
              {ticketStats && (
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Category Distribution Chart */}
                  <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6 lg:col-span-2">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-5">Tickets Category Split</h3>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: "General Query", tickets: ticketStats.categoryCounts?.general || 0 },
                          { name: "Bug Report", tickets: ticketStats.categoryCounts?.bug || 0 },
                          { name: "Feature Request", tickets: ticketStats.categoryCounts?.feature || 0 },
                          { name: "Other Support", tickets: ticketStats.categoryCounts?.other || 0 },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="tickets" fill="var(--ink)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Priority Breakdown card */}
                  <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6 space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Priority Distribution</h3>
                    <div className="space-y-3.5 select-none pt-2">
                      {[
                        { label: "Critical", count: ticketStats.priorityCounts?.CRITICAL || 0, color: "bg-red-500" },
                        { label: "High", count: ticketStats.priorityCounts?.HIGH || 0, color: "bg-orange-500" },
                        { label: "Medium", count: ticketStats.priorityCounts?.MEDIUM || 0, color: "bg-amber-500" },
                        { label: "Low", count: ticketStats.priorityCounts?.LOW || 0, color: "bg-blue-500" },
                      ].map((item) => {
                        const pct = ticketStats.total > 0 ? (item.count / ticketStats.total) * 100 : 0;
                        return (
                          <div key={item.label} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-ink">{item.label}</span>
                              <span className="text-graphite">{item.count} ({pct.toFixed(0)}%)</span>
                            </div>
                            <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                              <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Main Ticket Grid Table */}
              <div className="bg-surface rounded-2xl border border-rule card-shadow-md overflow-hidden">
                {/* Search / filter header */}
                <div className="p-4 border-b border-rule flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search support tickets..."
                      value={ticketsSearch}
                      onChange={(e) => setTicketsSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <select
                      value={ticketStatusFilter}
                      onChange={(e) => setTicketStatusFilter(e.target.value)}
                      className="bg-surface border border-gray-200 rounded-lg text-xs px-2.5 py-1.5 text-ink focus:outline-none"
                    >
                      <option value="">All Statuses</option>
                      <option value="NEW">New</option>
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="WAITING_USER">Waiting for User</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>

                    <select
                      value={ticketPriorityFilter}
                      onChange={(e) => setTicketPriorityFilter(e.target.value)}
                      className="bg-surface border border-gray-200 rounded-lg text-xs px-2.5 py-1.5 text-ink focus:outline-none"
                    >
                      <option value="">All Priorities</option>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>

                    <select
                      value={ticketCategoryFilter}
                      onChange={(e) => setTicketCategoryFilter(e.target.value)}
                      className="bg-surface border border-gray-200 rounded-lg text-xs px-2.5 py-1.5 text-ink focus:outline-none"
                    >
                      <option value="">All Categories</option>
                      <option value="general">General</option>
                      <option value="bug">Bug</option>
                      <option value="feature">Feature</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Table list */}
                {tickets.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 select-none">
                    <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-25" />
                    <p className="font-semibold text-sm">No tickets match these filters</p>
                    <button
                      onClick={() => {
                        setTicketsSearch("");
                        setTicketStatusFilter("");
                        setTicketPriorityFilter("");
                        setTicketCategoryFilter("");
                      }}
                      className="mt-3 text-blue-600 text-sm font-semibold hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-rule bg-gray-50/50">
                          <th className="px-6 py-3 font-semibold text-xs text-graphite">Ticket Number</th>
                          <th className="px-6 py-3 font-semibold text-xs text-graphite">User</th>
                          <th className="px-6 py-3 font-semibold text-xs text-graphite">Category</th>
                          <th className="px-6 py-3 font-semibold text-xs text-graphite">Subject</th>
                          <th className="px-6 py-3 font-semibold text-xs text-graphite text-center">Priority</th>
                          <th className="px-6 py-3 font-semibold text-xs text-graphite text-center">Status</th>
                          <th className="px-6 py-3 font-semibold text-xs text-graphite text-right">Created</th>
                          <th className="px-6 py-3 font-semibold text-xs text-graphite text-right">Assignee</th>
                          <th className="px-6 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rule">
                        {tickets.map((t) => (
                          <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-bold text-blue-600">
                              #TKT-{t.ticketNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <p className="font-semibold text-gray-900">{t.name}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{t.email}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap capitalize text-xs text-graphite">
                              {t.category}
                            </td>
                            <td className="px-6 py-4 max-w-xs truncate font-semibold text-ink">
                              {t.subject}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                t.priority === "CRITICAL"
                                  ? "text-red-700 bg-red-50"
                                  : t.priority === "HIGH"
                                  ? "text-orange-700 bg-orange-50"
                                  : "text-ink bg-gray-50"
                              }`}>
                                {t.priority.toLowerCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs">
                              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                                t.status === "NEW"
                                  ? "bg-blue-50 text-blue-700 border-blue-100"
                                  : t.status === "OPEN"
                                  ? "bg-amber-50 text-amber-700 border-amber-100"
                                  : t.status === "IN_PROGRESS"
                                  ? "bg-purple-50 text-purple-700 border-purple-100"
                                  : t.status === "WAITING_USER"
                                  ? "bg-orange-50 text-orange-700 border-orange-100"
                                  : "bg-green-50 text-green-700 border-green-100"
                              }`}>
                                {t.status.replace("_", " ").toLowerCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-graphite">
                              {new Date(t.createdAt).toLocaleDateString("en-IN")}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-ink font-semibold">
                              {t.assignedTo?.name || "Unassigned"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <Link
                                href={`/admin/tickets/${t.id}`}
                                className="inline-flex items-center text-xs font-semibold text-blue-600 hover:underline"
                              >
                                Manage
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination Controls */}
                {ticketsTotal > 15 && (
                  <div className="p-4 border-t border-rule flex items-center justify-between select-none">
                    <p className="text-xs text-graphite font-medium">
                      Showing {(ticketsPage - 1) * 15 + 1} to {Math.min(ticketsPage * 15, ticketsTotal)} of {ticketsTotal} entries
                    </p>
                    <div className="flex gap-2">
                      <button
                        disabled={ticketsPage <= 1}
                        onClick={() => fetchTickets(ticketsPage - 1)}
                        className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        Prev
                      </button>
                      <button
                        disabled={ticketsPage * 15 >= ticketsTotal}
                        onClick={() => fetchTickets(ticketsPage + 1)}
                        className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 8: SYSTEM SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
                Global App Settings
              </h2>

              <form onSubmit={saveSettings} className="bg-surface rounded-2xl border border-rule card-shadow-md p-6 max-w-lg space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Site Name</label>
                  <input
                    type="text"
                    value={sysSettings.siteName}
                    onChange={(e) => setSysSettings({ ...sysSettings, siteName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Logo URL</label>
                  <input
                    type="text"
                    value={sysSettings.logoUrl}
                    onChange={(e) => setSysSettings({ ...sysSettings, logoUrl: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Optional image URL path"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Maintenance Mode</label>
                  <select
                    value={sysSettings.maintenanceMode}
                    onChange={(e) => setSysSettings({ ...sysSettings, maintenanceMode: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-surface"
                  >
                    <option value="false">Off (Standard Site Access)</option>
                    <option value="true">On (Admin Panel Only)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Default Theme Option</label>
                  <input
                    type="text"
                    value={sysSettings.defaultTheme}
                    onChange={(e) => setSysSettings({ ...sysSettings, defaultTheme: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Max Upload Size (MB)</label>
                  <input
                    type="number"
                    value={sysSettings.maxUploadSize}
                    onChange={(e) => setSysSettings({ ...sysSettings, maxUploadSize: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Allowed File Formats</label>
                  <input
                    type="text"
                    value={sysSettings.allowedFileTypes}
                    onChange={(e) => setSysSettings({ ...sysSettings, allowedFileTypes: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                    placeholder="e.g. pdf,jpeg,png"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-sm"
                  >
                    Save Settings Configuration
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
