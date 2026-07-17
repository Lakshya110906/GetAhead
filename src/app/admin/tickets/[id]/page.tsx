"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  User, 
  CheckCircle,
  ShieldAlert,
  Trash2,
  Lock,
  Mail,
  UserCheck,
  Calendar,
  Layers
} from "lucide-react";

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

interface Note {
  id: string;
  content: string;
  createdAt: string;
  user: {
    name: string;
  };
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
  notes: Note[];
  ip: string | null;
  userAgent: string | null;
  assignedTo: {
    id: string;
    name: string;
  } | null;
}

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Forms & Actions
  const [activePane, setActivePane] = useState<"chat" | "notes">("chat");
  const [inputText, setInputText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusVal, setStatusVal] = useState("");
  const [priorityVal, setPriorityVal] = useState("");
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTicketDetails = useCallback(() => {
    if (!id) return;
    fetch(`/api/admin/tickets/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized or ticket not found");
        return res.json();
      })
      .then((data) => {
        if (data.success && data.ticket) {
          setTicket(data.ticket);
          setReplies(data.ticket.replies || []);
          setNotes(data.ticket.notes || []);
          setStatusVal(data.ticket.status);
          setPriorityVal(data.ticket.priority);
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Unauthorized admin access or ticket not found.");
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
  }, [replies, notes, activePane]);

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || submitting || !id) return;

    setSubmitting(true);
    const actionType = activePane === "chat" ? "reply" : "note";
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType, content: inputText.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (actionType === "reply" && data.reply) {
          setReplies((prev) => [...prev, data.reply]);
        } else if (actionType === "note" && data.note) {
          setNotes((prev) => [...prev, data.note]);
        }
        setInputText("");
        fetchTicketDetails(); // refresh attributes
      } else {
        setError(data.error || "Failed to post action");
      }
    } catch {
      setError("Failed to communicate with support ticketing system API.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (val: string) => {
    setStatusVal(val);
    try {
      await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: id, status: val }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handlePriorityChange = async (val: string) => {
    setPriorityVal(val);
    try {
      await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: id, priority: val }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelfAssign = async () => {
    try {
      // Find current user id from endpoint or session logic
      const res = await fetch(`/api/user/profile`);
      const profile = await res.json();
      if (profile.success && profile.user?.id) {
        const assignRes = await fetch("/api/admin/tickets", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId: id, assignedToId: profile.user.id }),
        });
        const assignData = await assignRes.json();
        if (assignData.success) {
          fetchTicketDetails();
        }
      }
    } catch (err) {
      console.error("Assign error:", err);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this support ticket? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/admin?tab=support");
      }
    } catch (err) {
      console.error("Delete ticket error:", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "NEW":
        return "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20";
      case "OPEN":
        return "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20";
      case "IN_PROGRESS":
        return "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20";
      case "WAITING_USER":
        return "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/20";
      case "RESOLVED":
        return "bg-green-50 text-green-700 border-green-100 dark:bg-green-950/20";
      case "CLOSED":
        return "bg-gray-50 text-gray-700 border-gray-100 dark:bg-gray-900";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">Loading support ticket details...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 shadow-sm">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4 animate-bounce" />
          <h2 className="font-bold text-gray-900 dark:text-white text-lg mb-2" style={{ fontFamily: "var(--font-poppins)" }}>
            Access Denied / Not Found
          </h2>
          <p className="text-gray-500 text-sm mb-6">{error || "Admin verification failed or ticket missing."}</p>
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm shadow-md cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Chat replies or internal private notes */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden min-h-[500px]">
          
          {/* Header Area */}
          <div className="border-b border-gray-100 dark:border-gray-800 p-4 bg-gray-50/50 dark:bg-gray-950 flex flex-wrap items-center justify-between gap-4 select-none">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/admin?tab=support")}
                className="w-8 h-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded border border-blue-100/50 dark:border-blue-900/30">
                    #TKT-{ticket.ticketNumber}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${getStatusColor(statusVal)}`}>
                    {statusVal.replace("_", " ").toLowerCase()}
                  </span>
                </div>
                <h2 className="font-bold text-gray-900 dark:text-white text-sm truncate mt-1 max-w-xs md:max-w-md">
                  {ticket.subject}
                </h2>
              </div>
            </div>

            {/* Toggle Pane Buttons */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <button
                onClick={() => setActivePane("chat")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  activePane === "chat"
                    ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                Customer Chat
              </button>
              <button
                onClick={() => setActivePane("notes")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  activePane === "notes"
                    ? "bg-white dark:bg-gray-900 text-amber-600 dark:text-amber-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                <Lock className="w-3 h-3" />
                Staff Notes ({notes.length})
              </button>
            </div>
          </div>

          {/* Scrollable Conversation Content Area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-gray-50/20 dark:bg-gray-950/20"
          >
            {activePane === "chat" ? (
              /* Customer Conversation Chat */
              <div className="space-y-4">
                {/* Original ticket request message */}
                <div className="flex gap-3 items-start mb-6">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col max-w-[85%]">
                    <div className="bg-white dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800/80 rounded-2xl px-4 py-3 text-sm text-gray-850 dark:text-gray-200 rounded-tl-none shadow-sm">
                      <p className="font-bold text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {ticket.name} (Original Submission)
                      </p>
                      <p className="whitespace-pre-wrap leading-relaxed break-words">{ticket.message}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 pl-1">
                      {new Date(ticket.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Reply Timeline */}
                {replies.map((reply) => {
                  const isSupport = reply.senderType === "ADMIN";
                  return (
                    <div 
                      key={reply.id} 
                      className={`flex gap-3 items-start ${isSupport ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSupport 
                          ? "bg-gradient-to-br from-blue-500 to-teal-500 text-white" 
                          : "bg-blue-600 text-white"
                      }`}>
                        {isSupport ? <CheckCircle className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>

                      <div className="flex flex-col max-w-[80%]">
                        <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          isSupport 
                            ? "bg-blue-600 text-white rounded-tr-none" 
                            : "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none"
                        }`}>
                          <p className="font-bold text-[10px] uppercase tracking-wide mb-1.5 opacity-60">
                            {isSupport ? reply.user?.name || "Support Staff" : ticket.name}
                          </p>
                          <p className="whitespace-pre-wrap leading-relaxed break-words">{reply.content}</p>
                        </div>
                        <span className={`text-[10px] text-gray-400 mt-1 px-1 ${isSupport ? "text-right" : ""}`}>
                          {new Date(reply.createdAt).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Internal Notes List Pane */
              <div className="space-y-4">
                {notes.length === 0 ? (
                  <div className="py-12 text-center select-none text-gray-400">
                    <Lock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-semibold">No internal notes added yet</p>
                    <p className="text-xs text-gray-500 mt-0.5">Notes are private and visible only to staff.</p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {note.user.name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(note.createdAt).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Form input controls */}
          <form onSubmit={handleActionSubmit} className="border-t border-gray-100 dark:border-gray-800 p-3 bg-white dark:bg-gray-900 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={activePane === "chat" ? "Type reply to customer..." : "Type private internal staff note..."}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-gray-50/50 dark:bg-gray-950 text-gray-800 dark:text-gray-200"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || submitting}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                inputText.trim() && !submitting
                  ? activePane === "chat"
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm cursor-pointer hover:scale-105"
                    : "bg-amber-500 text-white hover:bg-amber-600 shadow-sm cursor-pointer hover:scale-105"
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

        </div>

        {/* Right Column: Admin Actions & Metadata Details */}
        <div className="w-full lg:w-80 space-y-4 select-none">
          
          {/* Action Box Card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm" style={{ fontFamily: "var(--font-poppins)" }}>
              Admin Actions
            </h3>

            {/* Status Dropdown */}
            <div className="space-y-1">
              <label htmlFor="ticket-status-select" className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Status</label>
              <select
                id="ticket-status-select"
                value={statusVal}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-250 dark:border-gray-800 rounded-xl text-xs px-3 py-2 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-blue-500"
              >
                <option value="NEW">New</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_USER">Waiting for User</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Priority Dropdown */}
            <div className="space-y-1">
              <label htmlFor="ticket-priority-select" className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Priority</label>
              <select
                id="ticket-priority-select"
                value={priorityVal}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-250 dark:border-gray-800 rounded-xl text-xs px-3 py-2 text-gray-850 dark:text-gray-200 focus:outline-none focus:border-blue-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* Assign Ticket */}
            <div className="pt-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Assignment</p>
              {ticket.assignedTo ? (
                <div className="flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-2.5">
                  <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    {ticket.assignedTo.name}
                  </span>
                  <button
                    onClick={handleSelfAssign}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Reassign Me
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSelfAssign}
                  className="w-full text-center border border-dashed border-gray-200 dark:border-gray-850 rounded-xl py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50/20 hover:border-blue-200 transition-colors"
                >
                  Assign to Me
                </button>
              )}
            </div>

            {/* Danger Zone Deletion */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
              <button
                onClick={handleDelete}
                className="w-full flex items-center justify-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/10 rounded-xl py-2 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Ticket
              </button>
            </div>
          </div>

          {/* User & Metadata Details Summary */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm" style={{ fontFamily: "var(--font-poppins)" }}>
              Ticket Details
            </h3>

            <div className="space-y-3.5 divide-y divide-gray-50 dark:divide-gray-800/60 text-xs">
              <div className="pt-3 first:pt-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Category</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5 capitalize">{ticket.category}</p>
              </div>

              <div className="pt-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Customer</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{ticket.name}</p>
                <a href={`mailto:${ticket.email}`} className="text-blue-600 hover:underline flex items-center gap-1 mt-1 font-mono text-[10px]">
                  <Mail className="w-3 h-3" />
                  {ticket.email}
                </a>
              </div>

              <div className="pt-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-gray-450" />
                  Created
                </p>
                <p className="font-semibold text-gray-600 dark:text-gray-400 mt-0.5">
                  {new Date(ticket.createdAt).toLocaleString("en-IN")}
                </p>
              </div>

              <div className="pt-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                  <Layers className="w-3 h-3 text-gray-450" />
                  System Details
                </p>
                <p className="text-[10px] text-gray-650 dark:text-gray-400 font-mono mt-1 break-words bg-gray-50 dark:bg-gray-950 p-2 rounded-lg leading-relaxed border border-gray-150/40 dark:border-gray-800">
                  IP: {ticket.ip || "N/A"}<br />
                  UA: {ticket.userAgent || "N/A"}
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
