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

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error && d.totalEvaluations !== undefined) {
          setData(d);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const firstName = session?.user?.name?.split(" ")[0] || "there";

  const statsCards = [
    {
      title: "Total Evaluations",
      value: data.totalEvaluations.toString(),
      change: "All time uploads",
      icon: Award,
      positive: true,
    },
    {
      title: "Average Score",
      value: data.totalEvaluations === 0 ? "—" : `${data.avgPercentage}%`,
      change: data.totalEvaluations === 0 ? "No evaluations graded" : (data.avgPercentage >= 75 ? "↑ Great progress!" : "Keep improving!"),
      icon: TrendingUp,
      positive: data.avgPercentage >= 75,
    },
    {
      title: "Completed",
      value: data.completedEvaluations.toString(),
      change: `${data.totalEvaluations - data.completedEvaluations} in progress`,
      icon: FileText,
      positive: true,
    },
    {
      title: "Saved Reports",
      value: data.savedReportsCount.toString(),
      change: "Bookmarked summaries",
      icon: Bookmark,
      positive: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-poppins)" }}>
            Welcome back, {firstName}! 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Here&apos;s your academic performance overview
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 gradient-primary text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          New Evaluation
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <div
            key={stat.title}
            className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-5 hover:card-shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1" style={{ fontFamily: "var(--font-poppins)" }}>
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300 inline" /> : stat.value}
            </p>
            <p className={`text-xs font-medium ${stat.positive ? "text-green-600" : "text-amber-600"}`}>
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Performance Trend */}
        <div className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5" style={{ fontFamily: "var(--font-poppins)" }}>
            Performance Trend
          </h2>
          <div className="h-52">
            {data.completedEvaluations === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-4">
                <TrendingUp className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm font-medium">No evaluation data yet</p>
                <p className="text-gray-400 text-xs mt-0.5">Complete an evaluation to see trends</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#2563EB"
                    strokeWidth={3}
                    dot={{ fill: "#2563EB", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 7, fill: "#2563EB" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Subject Performance */}
        <div className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5" style={{ fontFamily: "var(--font-poppins)" }}>
            Subject Performance
          </h2>
          <div className="h-52">
            {data.completedEvaluations === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-4">
                <BarChart className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm font-medium">No evaluation data yet</p>
                <p className="text-gray-400 text-xs mt-0.5">Grades will be grouped by subject here</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.subjectPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="subject" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }}
                  />
                  <Bar dataKey="avgScore" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Evaluations */}
      <div className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "var(--font-poppins)" }}>
            Recent Evaluations
          </h2>
          <Link href="/analytics" className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : data.recentEvaluations.length === 0 ? (
          <div className="text-center py-10">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No evaluations yet</p>
            <p className="text-gray-400 text-sm mt-1">Start your first evaluation to see results here</p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 gradient-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl mt-4 hover:opacity-90"
            >
              <PlusCircle className="w-4 h-4" />
              Start Evaluation
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
                  <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center text-white text-xs font-bold">
                    {ev.subject.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{ev.subject}</p>
                    <p className="text-gray-500 text-xs">{ev.grade} • {new Date(ev.createdAt).toLocaleDateString("en-IN")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {ev.obtainedMarks}/{ev.totalMarks}
                    </p>
                    <p className={`text-xs font-semibold ${
                      (ev.percentage ?? 0) >= 75 ? "text-green-600" : 
                      (ev.percentage ?? 0) >= 50 ? "text-amber-600" : "text-red-500"
                    }`}>
                      {ev.percentage?.toFixed(1)}%
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    ev.status === "COMPLETED"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {ev.status === "COMPLETED" ? "Done" : "Processing"}
                  </span>
                  <Link
                    href={`/evaluation/${ev.id}`}
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
