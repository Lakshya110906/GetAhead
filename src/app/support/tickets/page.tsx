"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Search, 
  Filter, 
  MessageSquare, 
  Plus, 
  Loader2, 
  ChevronRight 
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/Header";

interface Ticket {
  id: string;
  ticketNumber: number;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  useEffect(() => {
    fetch("/api/support/tickets")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTickets(data.tickets || []);
        }
      })
      .catch((err) => console.error("Error loading tickets:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredTickets = tickets.filter((t) => {
    // Search query filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchSearch =
        t.subject.toLowerCase().includes(q) ||
        `#tkt-${t.ticketNumber}`.includes(q) ||
        t.category.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    // Status Filter
    if (statusFilter !== "all" && t.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }

    // Priority Filter
    if (priorityFilter !== "all" && t.priority.toLowerCase() !== priorityFilter.toLowerCase()) {
      return false;
    }

    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "NEW":
        return "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30";
      case "OPEN":
        return "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
      case "IN_PROGRESS":
        return "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30";
      case "WAITING_USER":
        return "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30";
      case "RESOLVED":
        return "bg-green-50 text-green-700 border-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30";
      case "CLOSED":
        return "bg-gray-50 text-gray-700 border-gray-100 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case "CRITICAL":
        return "text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400";
      case "HIGH":
        return "text-orange-600 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400";
      case "MEDIUM":
        return "text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-900 dark:text-gray-400";
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-black">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        
        <main className="flex-1 p-4 sm:p-6 pt-16 lg:pt-6 overflow-auto">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "var(--font-poppins)" }}>
                  My Support Tickets
                </h1>
                <p className="text-gray-500 text-sm">
                  Track and continue previous conversation threads with our support staff
                </p>
              </div>
              <Link 
                href="/contact"
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-teal-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-95 shadow-md shadow-blue-500/10 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create New Ticket
              </Link>
            </div>

            {/* Filter and Search controls */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-950 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter by:</span>
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg text-xs px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="new">New</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_user">Waiting for User</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg text-xs px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-12 text-center shadow-sm">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Loading tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-12 text-center shadow-sm select-none">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-500 mx-auto mb-4 border border-blue-100/50 dark:border-blue-900/30">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1" style={{ fontFamily: "var(--font-poppins)" }}>
                  No tickets found
                </h3>
                <p className="text-gray-500 text-sm max-w-xs mx-auto mb-5">
                  {tickets.length === 0
                    ? "You haven't submitted any support requests yet. Create a ticket to get started."
                    : "Try adjusting your filters or search terms."}
                </p>
                {tickets.length === 0 && (
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-teal-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:opacity-95 shadow-md shadow-blue-500/10 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Create Ticket
                  </Link>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950 select-none">
                        <th className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-6 py-4">Ticket</th>
                        <th className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-6 py-4">Subject</th>
                        <th className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-6 py-4">Category</th>
                        <th className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-6 py-4 text-center">Priority</th>
                        <th className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-6 py-4 text-center">Status</th>
                        <th className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-6 py-4 text-right">Created</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                      {filteredTickets.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link href={`/support/tickets/${ticket.id}`} className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                              #TKT-{ticket.ticketNumber}
                            </Link>
                          </td>
                          <td className="px-6 py-4 min-w-[200px] max-w-xs truncate">
                            <Link href={`/support/tickets/${ticket.id}`} className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              {ticket.subject}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                              {ticket.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border border-transparent capitalize ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority.toLowerCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${getStatusColor(ticket.status)}`}>
                              {ticket.status.replace("_", " ").toLowerCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-gray-500 dark:text-gray-400">
                            {new Date(ticket.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <Link href={`/support/tickets/${ticket.id}`} className="inline-flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                              Chat <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
