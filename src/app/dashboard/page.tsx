"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  PlusCircle,
  TrendingUp,
  Award,
  FileText,
  ChevronRight,
  Loader2,
  Bookmark,
} from "lucide-react";
import { getGrade, getGradeColor } from "@/lib/utils";

interface AnalyticsData {
  totalEvaluations: number;
  completedEvaluations: number;
  avgPercentage: number;
  savedReportsCount: number;
  monthlyTrend: Array<{ month: string; score: number; count: number }>;
  subjectPerformance: Array<{ subject: string; avgScore: number; count: number }>;
  recentEvaluations: Array<{
    id: string;
    subject: string;
    grade: string | null;
    percentage: number | null;
    obtainedMarks: number | null;
    totalMarks: number | null;
    status: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<AnalyticsData>({
    totalEvaluations: 0,
    completedEvaluations: 0,
    avgPercentage: 0,
    savedReportsCount: 0,
    monthlyTrend: [],
    subjectPerformance: [],
    recentEvaluations: [],
  });
  const [loading, setLoading] = useState(true);
  // A fetch failure must not render identically to "no evaluations yet" —
  // those mean very different things to a user deciding whether to trust
  // the zeros on screen. Tracked separately from `data` so a failed
  // request never silently masquerades as a genuinely empty account.
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error && d.totalEvaluations !== undefined) {
          setData(d);
        } else {
          setLoadError(true);
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const firstName = session?.user?.name?.split(" ")[0] || "there";
  const hasGrades = data.totalEvaluations > 0;

  const otherStats = [
    {
      title: "Total evaluations",
      value: data.totalEvaluations.toString(),
      change: "All time uploads",
      icon: Award,
    },
    {
      title: "Completed",
      value: data.completedEvaluations.toString(),
      change: `${data.totalEvaluations - data.completedEvaluations} in progress`,
      icon: FileText,
    },
    {
      title: "Saved reports",
      value: data.savedReportsCount.toString(),
      change: "Bookmarked summaries",
      icon: Bookmark,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
            Welcome back, {firstName}!
          </h1>
          <p className="text-graphite text-sm mt-0.5">
            Here&apos;s your academic performance overview
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 bg-ink text-paper font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          New evaluation
        </Link>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          Couldn&apos;t load your dashboard data. The numbers below may be stale or incomplete — try refreshing the page.
        </div>
      )}

      {/* Standing + supporting stats: the average-score card carries a real
          grade badge — the same circled-mark convention as the report and
          upload screens — so the dashboard's single most-asked question,
          "how am I doing," reads at a glance rather than as one tile among four. */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-5 sm:col-span-2 flex items-center gap-4">
          <div
            className={`w-16 h-16 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-mono text-lg font-bold ${
              hasGrades ? getGradeColor(data.avgPercentage) : "text-gray-300"
            }`}
            style={{ borderColor: "currentcolor" }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : hasGrades ? getGrade(data.avgPercentage) : "—"}
          </div>
          <div>
            <p className="text-sm text-graphite font-medium">Average score</p>
            <p className="text-3xl font-bold text-ink font-mono tabular-nums leading-tight">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300 inline" /> : hasGrades ? `${data.avgPercentage}%` : "—"}
            </p>
            <p className={`text-xs font-medium mt-0.5 ${hasGrades ? (data.avgPercentage >= 75 ? "text-green-600" : "text-amber-600") : "text-gray-400"}`}>
              {hasGrades ? (data.avgPercentage >= 75 ? "Strong average — keep it up" : "Room to climb — keep practicing") : "No evaluations graded yet"}
            </p>
          </div>
        </div>

        {otherStats.map((stat) => (
          <div
            key={stat.title}
            className="bg-surface rounded-2xl border border-rule card-shadow-md p-5 hover:card-shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-graphite font-medium">{stat.title}</p>
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-ink mb-1 font-mono tabular-nums">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300 inline" /> : stat.value}
            </p>
            <p className="text-xs font-medium text-graphite">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Performance Trend */}
        <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6">
          <h2 className="text-lg font-bold text-ink mb-5" style={{ fontFamily: "var(--font-display)" }}>
            Performance trend
          </h2>
          <div className="h-52">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
              </div>
            ) : data.completedEvaluations === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-4">
                <TrendingUp className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-graphite text-sm font-medium">No evaluation data yet</p>
                <p className="text-gray-400 text-xs mt-0.5">Complete an evaluation to see trends</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--graphite)" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--graphite)" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid var(--rule)", backgroundColor: "var(--paper)", color: "var(--ink)", fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--ink)"
                    strokeWidth={3}
                    dot={{ fill: "var(--ink)", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 7, fill: "var(--ink)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Subject Performance */}
        <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6">
          <h2 className="text-lg font-bold text-ink mb-5" style={{ fontFamily: "var(--font-display)" }}>
            Subject performance
          </h2>
          <div className="h-52">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
              </div>
            ) : data.completedEvaluations === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-4">
                <BarChart className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-graphite text-sm font-medium">No evaluation data yet</p>
                <p className="text-gray-400 text-xs mt-0.5">Grades will be grouped by subject here</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.subjectPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
                  <XAxis dataKey="subject" tick={{ fontSize: 11, fill: "var(--graphite)" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--graphite)" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid var(--rule)", backgroundColor: "var(--paper)", color: "var(--ink)", fontSize: 12 }}
                  />
                  <Bar dataKey="avgScore" fill="var(--ink)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Evaluations */}
      <div className="bg-surface rounded-2xl border border-rule card-shadow-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
            Recent evaluations
          </h2>
          <Link href="/analytics" className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">
            View all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm text-graphite">Loading your evaluations...</p>
          </div>
        ) : data.recentEvaluations.length === 0 ? (
          <div className="text-center py-10">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-graphite font-medium">No evaluations yet</p>
            <p className="text-gray-400 text-sm mt-1">Start your first evaluation to see results here</p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 bg-ink text-paper text-sm font-semibold px-5 py-2.5 rounded-xl mt-4 hover:opacity-90"
            >
              <PlusCircle className="w-4 h-4" />
              Start evaluation
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.recentEvaluations.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  {ev.status === "SUCCEEDED" && ev.percentage != null ? (
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold ${getGradeColor(ev.percentage)}`}
                      style={{ borderColor: "currentcolor" }}
                    >
                      {getGrade(ev.percentage)}
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-fixed-ink rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {ev.subject.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-ink text-sm">{ev.subject}</p>
                    <p className="text-graphite text-xs">{ev.grade} • {new Date(ev.createdAt).toLocaleDateString("en-IN")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-ink font-mono tabular-nums">
                      {ev.obtainedMarks}/{ev.totalMarks}
                    </p>
                    <p className={`text-xs font-semibold font-mono tabular-nums ${
                      (ev.percentage ?? 0) >= 75 ? "text-green-600" :
                      (ev.percentage ?? 0) >= 50 ? "text-amber-600" : "text-red-500"
                    }`}>
                      {ev.percentage?.toFixed(1)}%
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    ev.status === "SUCCEEDED"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {ev.status === "SUCCEEDED" ? "Done" : "Processing"}
                  </span>
                  <Link
                    href={`/evaluation/${ev.id}`}
                    aria-label={`View ${ev.subject} report`}
                    className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
