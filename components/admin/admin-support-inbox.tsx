"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  MessageSquare,
  Send,
  RefreshCw,
  ChevronLeft,
  CheckCheck,
  X,
  Clock,
  User,
  ShieldCheck,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface ConversationSummary {
  id: string;
  subject: string;
  status: "open" | "resolved" | "closed";
  lastMessage: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  sender: "user" | "admin";
  text: string;
  createdAt: string;
}

interface FullConversation {
  id: string;
  subject: string;
  status: "open" | "resolved" | "closed";
  messages: Message[];
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700 border-emerald-200",
  resolved: "bg-blue-100 text-blue-700 border-blue-200",
  closed: "bg-indigo-50 text-gray-600 border-indigo-100",
};

export default function AdminSupportInbox() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | "open" | "resolved" | "closed">("");
  const [loadingList, setLoadingList] = useState(false);
  const [selected, setSelected] = useState<FullConversation | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/support/conversations");
      const json = await res.json();
      setConversations(json.conversations ?? []);
    } catch {
      // keep existing list
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages]);

  const openThread = async (id: string) => {
    setLoadingThread(true);
    setSelected(null);
    try {
      const res = await fetch(`/api/support/conversations/${id}`);
      const json = await res.json();
      setSelected(json);
    } catch {
      // nothing
    } finally {
      setLoadingThread(false);
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/conversations/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply.trim() }),
      });
      if (!res.ok) return;
      const newMsg: Message = {
        sender: "admin",
        text: reply.trim(),
        createdAt: new Date().toISOString(),
      };
      setSelected((prev) => prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev);
      setReply("");
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selected.id ? { ...c, lastMessage: newMsg.text, messageCount: c.messageCount + 1 } : c
        )
      );
    } catch {
      // nothing
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (newStatus: "open" | "resolved" | "closed") => {
    if (!selected) return;
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/support/conversations/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) return;
      setSelected((prev) => prev ? { ...prev, status: newStatus } : prev);
      setConversations((prev) =>
        prev.map((c) => (c.id === selected.id ? { ...c, status: newStatus } : c))
      );
    } catch {
      // nothing
    } finally {
      setChangingStatus(false);
    }
  };

  const visible = statusFilter
    ? conversations.filter((c) => c.status === statusFilter)
    : conversations;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Support Inbox</h2>
          <p className="text-sm text-gray-500">
            {conversations.filter((c) => c.status === "open").length} open tickets
          </p>
        </div>
        <Button variant="outline" onClick={fetchConversations} disabled={loadingList}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loadingList ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {(["", "open", "resolved", "closed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              statusFilter === s
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-600 border-indigo-100 hover:border-indigo-300"
            }`}
          >
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            {s === "open" && (
              <span className="ml-1.5 bg-emerald-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
                {conversations.filter((c) => c.status === "open").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[600px]">
        {/* Left: conversation list */}
        <div
          className={`lg:col-span-2 rounded-2xl border border-indigo-100 bg-white overflow-hidden shadow-sm flex flex-col ${
            selected ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="px-4 py-3 border-b border-gray-100 bg-indigo-50/40">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {visible.length} conversation{visible.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loadingList ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Loading…
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                <Inbox className="w-10 h-10 text-gray-300" />
                <p className="text-sm">No conversations</p>
              </div>
            ) : (
              visible.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => openThread(conv.id)}
                  className={`w-full text-left px-4 py-4 hover:bg-indigo-50 transition-colors ${
                    selected?.id === conv.id ? "bg-indigo-50 border-l-4 border-indigo-500" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900 truncate flex-1">
                      {conv.subject}
                    </p>
                    <span
                      className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[conv.status]}`}
                    >
                      {conv.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mb-1">{conv.lastMessage}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <MessageSquare className="w-3 h-3" />
                    <span>{conv.messageCount}</span>
                    <Clock className="w-3 h-3 ml-1" />
                    <span>{formatTime(conv.updatedAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: thread view */}
        <div
          className={`lg:col-span-3 rounded-2xl border border-indigo-100 bg-white shadow-sm flex flex-col overflow-hidden ${
            !selected && !loadingThread ? "hidden lg:flex" : "flex"
          }`}
        >
          {loadingThread ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading thread…
            </div>
          ) : selected ? (
            <>
              {/* Thread header */}
              <div className="px-5 py-4 border-b border-gray-100 bg-indigo-50/40 flex items-start gap-3">
                <button
                  onClick={() => setSelected(null)}
                  className="lg:hidden p-1.5 rounded-lg hover:bg-gray-200 shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{selected.subject}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[selected.status]}`}
                    >
                      {selected.status}
                    </span>
                    <span className="text-xs text-gray-400">{formatTime(selected.createdAt)}</span>
                  </div>
                </div>
                {/* Status actions */}
                <div className="flex gap-2 shrink-0">
                  {selected.status !== "resolved" && (
                    <button
                      onClick={() => changeStatus("resolved")}
                      disabled={changingStatus}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Resolve
                    </button>
                  )}
                  {selected.status !== "closed" && (
                    <button
                      onClick={() => changeStatus("closed")}
                      disabled={changingStatus}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50/40 border border-indigo-100 text-xs font-medium text-gray-600 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Close
                    </button>
                  )}
                  {selected.status !== "open" && (
                    <button
                      onClick={() => changeStatus("open")}
                      disabled={changingStatus}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {selected.messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${msg.sender === "admin" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ${
                        msg.sender === "admin"
                          ? "bg-gradient-to-br from-indigo-500 to-purple-600"
                          : "bg-gradient-to-br from-gray-400 to-gray-500"
                      }`}
                    >
                      {msg.sender === "admin" ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <div className={`max-w-[75%] ${msg.sender === "admin" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          msg.sender === "admin"
                            ? "bg-indigo-600 text-white rounded-tr-sm"
                            : "bg-indigo-50 text-gray-800 rounded-tl-sm"
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Reply box */}
              {selected.status !== "closed" && (
                <div className="border-t border-gray-100 px-5 py-4 bg-indigo-50/40">
                  <div className="flex gap-3 items-end">
                    <Textarea
                      className="flex-1 min-h-[80px] rounded-xl resize-none border-indigo-100 bg-white text-sm"
                      placeholder="Type your reply…"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply();
                      }}
                    />
                    <Button
                      onClick={sendReply}
                      disabled={sending || !reply.trim()}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 h-10 px-4"
                    >
                      {sending ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">Ctrl+Enter to send</p>
                </div>
              )}

              {selected.status === "closed" && (
                <div className="border-t border-gray-100 px-5 py-4 bg-indigo-50/40 text-center text-sm text-gray-400">
                  This conversation is closed. Reopen it to reply.
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
              <MessageSquare className="w-12 h-12 text-gray-200" />
              <p className="text-sm">Select a conversation to view the thread</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
