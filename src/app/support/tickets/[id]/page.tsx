"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  AlertCircle, 
  User, 
  CheckCircle,
  Shield,
  LifeBuoy
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/Header";

interface Reply {
  id: string;
  senderType: string;
  content: string;
  createdAt: string;
  user: {
    name: string;
    avatar: string | null;
    role: string;
  } | null;
}

interface Ticket {
  id: string;
  ticketNumber: number;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  replies: Reply[];
}

export default function UserTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [replyInput, setReplyInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTicketDetails = useCallback(() => {
    if (!id) return;
    fetch(`/api/support/tickets/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Ticket not found or forbidden access");
        return res.json();
      })
      .then((data) => {
        if (data.success && data.ticket) {
          setTicket(data.ticket);
          setReplies(data.ticket.replies || []);
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load ticket details or you do not have permission to view it.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchTicketDetails();
  }, [id, fetchTicketDetails]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [replies]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim() || submitting || !id) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/support/tickets/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.reply) {
        setReplies((prev) => [...prev, data.reply]);
        setReplyInput("");
        // Reload details to sync status updates
        fetchTicketDetails();
      } else {
        setError(data.error || "Failed to post reply");
      }
    } catch {
      setError("Connection failure. Unable to submit message.");
    } finally {
      setSubmitting(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-black">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-sm font-medium">Loading ticket conversation...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-black">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md text-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 shadow-sm">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 animate-bounce" />
              <h2 className="font-bold text-gray-900 dark:text-white text-lg mb-2" style={{ fontFamily: "var(--font-poppins)" }}>
                Unable to Load Ticket
              </h2>
              <p className="text-gray-500 text-sm mb-6">{error || "The ticket was not found."}</p>
              <button
                onClick={() => router.push("/support/tickets")}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm shadow-md cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to My Tickets
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-black">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        
        <main className="flex-1 p-4 sm:p-6 pt-16 lg:pt-6 overflow-hidden flex flex-col">
          <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
            
            {/* Left Column: Chat Conversation */}
            <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden min-h-[450px]">
              
              {/* Ticket Chat Header */}
              <div className="border-b border-gray-100 dark:border-gray-800 p-4 bg-gray-50/50 dark:bg-gray-950 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push("/support/tickets")}
                    className="w-8 h-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded border border-blue-100/50 dark:border-blue-900/30">
                        #TKT-{ticket.ticketNumber}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace("_", " ").toLowerCase()}
                      </span>
                    </div>
                    <h2 className="font-bold text-gray-900 dark:text-white text-sm truncate mt-1 max-w-xs md:max-w-md">
                      {ticket.subject}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Chat Timeline list */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-gray-50/20 dark:bg-gray-950/20"
              >
                {/* Original ticket message */}
                <div className="flex gap-3 items-start mb-6">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col max-w-[85%]">
                    <div className="bg-white dark:bg-gray-950 border border-gray-200/60 dark:border-gray-850 rounded-2xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200 rounded-tl-none shadow-sm">
                      <p className="font-bold text-xs text-gray-500 dark:text-gray-400 mb-1">{ticket.name} (Original Query)</p>
                      <p className="whitespace-pre-wrap leading-relaxed break-words">{ticket.message}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 pl-1">
                      {new Date(ticket.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Ticket replies list */}
                {replies.map((reply) => {
                  const isAdmin = reply.senderType === "ADMIN";
                  return (
                    <div 
                      key={reply.id} 
                      className={`flex gap-3 items-start ${isAdmin ? "flex-row" : "flex-row-reverse"}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isAdmin 
                          ? "bg-gradient-to-br from-blue-500 to-teal-500 text-white" 
                          : "bg-blue-600 text-white"
                      }`}>
                        {isAdmin ? <LifeBuoy className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>

                      <div className="flex flex-col max-w-[80%]">
                        <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          isAdmin 
                            ? "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none" 
                            : "bg-blue-600 text-white rounded-tr-none"
                        }`}>
                          <p className="font-bold text-[10px] uppercase tracking-wide mb-1.5 opacity-60">
                            {isAdmin ? reply.user?.name || "Support Staff" : "You"}
                          </p>
                          <p className="whitespace-pre-wrap leading-relaxed break-words">{reply.content}</p>
                        </div>
                        <span className={`text-[10px] text-gray-400 mt-1 px-1 ${!isAdmin ? "text-right" : ""}`}>
                          {new Date(reply.createdAt).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input area */}
              {ticket.status.toUpperCase() !== "CLOSED" ? (
                <form onSubmit={handleSendReply} className="border-t border-gray-100 dark:border-gray-800 p-3 bg-white dark:bg-gray-900 flex items-center gap-2">
                  <input
                    type="text"
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    placeholder="Type your reply..."
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-gray-50/50 dark:bg-gray-950 text-gray-800 dark:text-gray-200"
                  />
                  <button
                    type="submit"
                    disabled={!replyInput.trim() || submitting}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      replyInput.trim() && !submitting
                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm cursor-pointer hover:scale-105"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                    }`}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              ) : (
                <div className="border-t border-gray-100 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-950 text-center select-none">
                  <p className="text-xs text-gray-500 font-semibold flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    This ticket has been resolved and closed.
                  </p>
                </div>
              )}
            </div>

            {/* Right Sidebar: Details Grid */}
            <div className="w-full lg:w-72 space-y-4">
              
              {/* Ticket Details summary card */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4 select-none">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm" style={{ fontFamily: "var(--font-poppins)" }}>
                  Ticket Details
                </h3>

                <div className="space-y-3 divide-y divide-gray-50 dark:divide-gray-800/60">
                  <div className="pt-3 first:pt-0">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Category</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5 capitalize">{ticket.category}</p>
                  </div>

                  <div className="pt-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Priority</p>
                    <p className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                      ticket.priority === "CRITICAL"
                        ? "text-red-700 bg-red-50 border border-red-100"
                        : ticket.priority === "HIGH"
                        ? "text-orange-700 bg-orange-50 border border-orange-100"
                        : "text-gray-700 bg-gray-50 border border-gray-100"
                    }`}>
                      {ticket.priority.toUpperCase()}
                    </p>
                  </div>

                  <div className="pt-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Created</p>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-0.5">
                      {new Date(ticket.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="pt-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Last Updated</p>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-0.5">
                      {new Date(ticket.updatedAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Support note warning */}
              <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-blue-800 dark:text-blue-400 flex items-center gap-1.5 mb-1.5">
                  <Shield className="w-4 h-4" /> Secure Conversation
                </h4>
                <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-normal">
                  All messages sent between you and support staff are isolated at the database level and verified for security.
                </p>
              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
