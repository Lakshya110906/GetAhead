"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, BarChart3, Target, Award, Loader2 } from "lucide-react";

const COLORS = ["#2563EB", "#14B8A6", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6"];

const DEMO_MONTHLY = [
  { month: "Jan", score: 65, evaluations: 2 },
  { month: "Feb", score: 72, evaluations: 3 },
  { month: "Mar", score: 68, evaluations: 2 },
  { month: "Apr", score: 85, evaluations: 5 },
  { month: "May", score: 78, evaluations: 4 },
  { month: "Jun", score: 90, evaluations: 6 },
];

const DEMO_SUBJECTS = [
  { subject: "Mathematics", avgScore: 82, count: 8 },
  { subject: "Physics", avgScore: 75, count: 6 },
  { subject: "Chemistry", avgScore: 88, count: 4 },
  { subject: "Biology", avgScore: 70, count: 4 },
  { subject: "English", avgScore: 85, count: 2 },
];

export default function AnalyticsPage() {
  const [monthly, setMonthly] = useState(DEMO_MONTHLY);
  const [subjects, setSubjects] = useState(DEMO_SUBJECTS);
  const [total, setTotal] = useState(24);
  const [avgPct, setAvgPct] = useState(78);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setMonthly(d.monthlyTrend || DEMO_MONTHLY);
          setSubjects(d.subjectPerformance?.length ? d.subjectPerformance : DEMO_SUBJECTS);
          setTotal(d.totalEvaluations || 24);
          setAvgPct(d.avgPercentage || 78);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pieData = subjects.map((s) => ({ name: s.subject, value: s.count }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-poppins)" }}>
          Analytics
        </h1>
        <p className="text-gray-500 text-sm">Deep dive into your academic performance</p>
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Exams", value: total, icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Avg. Score", value: `${avgPct}%`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
          { label: "Subjects", value: subjects.length, icon: Target, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Best Score", value: `${Math.max(...subjects.map((s) => s.avgScore), 0)}%`, icon: Award, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <p className={`text-3xl font-bold ${stat.color}`} style={{ fontFamily: "var(--font-poppins)" }}>
              {loading ? <Loader2 className="w-6 h-6 animate-spin inline opacity-40" /> : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Score Trend */}
      <div className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5" style={{ fontFamily: "var(--font-poppins)" }}>
          Monthly Score Trend
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#6b7280" }} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }}
                formatter={(value) => [`${value}%`, "Avg Score"]}
              />
              <Line type="monotone" dataKey="score" stroke="#2563EB" strokeWidth={3}
                dot={{ fill: "#2563EB", strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8, fill: "#2563EB" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subject Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5" style={{ fontFamily: "var(--font-poppins)" }}>
            Subject Performance
          </h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjects} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="subject" tick={{ fontSize: 11, fill: "#6b7280" }} width={90} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }}
                  formatter={(value) => [`${value}%`, "Avg Score"]}
                />
                <Bar dataKey="avgScore" radius={[0, 6, 6, 0]}>
                  {subjects.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5" style={{ fontFamily: "var(--font-poppins)" }}>
            Evaluations by Subject
          </h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }}
                  formatter={(value, name) => [value, name]}
                />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Evaluations Count Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 card-shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5" style={{ fontFamily: "var(--font-poppins)" }}>
          Evaluations per Month
        </h2>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              <Bar dataKey="evaluations" fill="#14B8A6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
