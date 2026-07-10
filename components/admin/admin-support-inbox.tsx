"use client";

import { useEffect, useState, useRef, useCallback, useTransition } from "react";
import {
  MessageSquare, Send, RefreshCw, ChevronLeft,
  CheckCheck, Clock, User, ShieldCheck, Inbox,
  Search, X, Mail, MailOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ConversationSummary {
  id: string; subject: string; status: "open" | "resolved" | "closed";
  userName: string; userEmail: string;
  lastMessage: string; lastSender: "user" | "admin" | null;
  messageCount: number; createdAt: string; updatedAt: string;
}

interface Message { sender: "user" | "admin"; text: string; createdAt: string; }

interface FullConversation {
  id: string; subject: string; status: "open" | "resolved" | "closed";
  userName: string; userEmail: string;
  messages: Message[]; createdAt: string; updatedAt: string;
}

type Summary = { open: number; resolved: number; closed: number };

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  open:     { label: "Open",     color: "text-emerald-700", bg: "bg-emerald-100 border-emerald-200",  dot: "bg-emerald-500" },
  resolved: { label: "Resolved", color: "text-blue-700",    bg: "bg-blue-100 border-blue-200",        dot: "bg-blue-500"    },
  closed:   { label: "Closed",   color: "text-slate-600",   bg: "bg-slate-100 border-slate-200",      dot: "bg-slate-400"   },
};

export default function AdminSupportInbox() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [total, setTotal]                 = useState(0);
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [summary, setSummary]             = useState<Summary>({ open: 0, resolved: 0, closed: 0 });
  const [statusFilter, setStatusFilter]   = useState<"" | "open" | "resolved" | "closed">("open");
  const [search, setSearch]               = useState("");
  const [loadingList, setLoadingList]     = useState(false);
  const [selected, setSelected]           = useState<FullConversation | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [reply, setReply]                 = useState("");
  const [sending, setSending]             = useState(false);
  const [, startTransition]               = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchList = useCallback(async (p = 1) => {
    setLoadingList(true);
    const q = new URLSearchParams({ page: String(p) });
    if (statusFilter) q.set("status", statusFilter);
    if (search)       q.set("search", search);
    try {
      const res = await window.fetch(`/api/admin/support?${q}`);
      const json = await res.json();
      setConversations(json.conversations ?? []);
      setTotal(json.total ?? 0);
      setPage(json.page ?? 1);
      setTotalPages(json.totalPages ?? 1);
      setSummary(json.summary ?? { open: 0, resolved: 0, closed: 0 });
    } finally { setLoadingList(false); }
  }, [statusFilter, search]);

  useEffect(() => { startTransition(() => { fetchList(1); }); }, [fetchList]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [selected?.messages]);

  async function openThread(id: string) {
    setLoadingThread(true);
    const res = await window.fetch(`/api/admin/support/${id}`);
    if (res.ok) { const d = await res.json(); setSelected(d.conversation); }
    setLoadingThread(false);
  }

  async function handleSend(newStatus?: string) {
    if (!selected) return;
    if (!reply.trim() && !newStatus) return;
    setSending(true);
    const res = await window.fetch(`/api/admin/support/${selected.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: reply.trim() || undefined, status: newStatus }),
    });
    if (res.ok) {
      const d = await res.json();
      setSelected(d.conversation);
      setReply("");
      fetchList(page);
    }
    setSending(false);
  }

  const cfg = statusFilter ? STATUS_CFG[statusFilter] : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Inbox className="size-5 text-indigo-600" /> Support Inbox
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Read and reply to passenger support tickets.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchList(page)} disabled={loadingList}>
          <RefreshCw className={cn("size-4 mr-1.5", loadingList && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* Summary tabs */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setStatusFilter("")}
          className={cn("rounded-xl border px-4 py-2 text-sm font-medium transition-all",
            statusFilter === "" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 hover:bg-slate-50")}>
          All <span className="ml-1 opacity-70">{summary.open + summary.resolved + summary.closed}</span>
        </button>
        {(["open", "resolved", "closed"] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn("rounded-xl border px-4 py-2 text-sm font-medium transition-all flex items-center gap-2",
              statusFilter === s ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 hover:bg-slate-50")}>
            <span className={cn("size-2 rounded-full", STATUS_CFG[s].dot)} />
            {STATUS_CFG[s].label}
            <span className="opacity-70">{summary[s]}</span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-4 min-h-[560px]">
        {/* List panel */}
        <div className="rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input placeholder="Search by subject…" value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="size-4 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingList ? (
              <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
            ) : conversations.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">No tickets found.</div>
            ) : conversations.map(c => {
              const s = STATUS_CFG[c.status];
              const isSelected = selected?.id === c.id;
              return (
                <button key={c.id} onClick={() => openThread(c.id)}
                  className={cn("w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors",
                    isSelected && "bg-indigo-50 border-l-2 border-indigo-500")}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-800 line-clamp-1 flex-1">{c.subject}</p>
                    <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5 border shrink-0", s.bg, s.color)}>
                      {s.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{c.userName} · {c.userEmail}</p>
                  <p className="text-xs text-slate-400 line-clamp-1">
                    {c.lastSender === "admin" ? <span className="text-indigo-500">You: </span> : null}
                    {c.lastMessage || "No messages yet"}
                  </p>
                  <p className="text-[10px] text-slate-300 mt-1">
                    {new Date(c.updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {" · "}{c.messageCount} msg{c.messageCount !== 1 ? "s" : ""}
                  </p>
                </button>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="p-3 border-t flex items-center justify-between bg-slate-50">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => fetchList(page - 1)} className="h-7 text-xs">Prev</Button>
              <span className="text-xs text-slate-400">{page} / {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => fetchList(page + 1)} className="h-7 text-xs">Next</Button>
            </div>
          )}
        </div>

        {/* Thread panel */}
        <div className="rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
              <MessageSquare className="size-10 opacity-30" />
              <p className="text-sm">Select a ticket to view the conversation</p>
            </div>
          ) : loadingThread ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Loading…</div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-4 py-3 border-b flex items-start justify-between gap-3 bg-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{selected.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="font-medium">{selected.userName}</span> · {selected.userEmail}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("text-xs font-medium rounded-full px-2.5 py-0.5 border", STATUS_CFG[selected.status].bg, STATUS_CFG[selected.status].color)}>
                    {STATUS_CFG[selected.status].label}
                  </span>
                  {selected.status === "open" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => handleSend("resolved")} disabled={sending}>
                      <CheckCheck className="size-3 mr-1" /> Resolve
                    </Button>
                  )}
                  {selected.status !== "closed" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs text-slate-500 hover:bg-slate-100"
                      onClick={() => handleSend("closed")} disabled={sending}>
                      Close
                    </Button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selected.messages.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-8">No messages yet.</p>
                ) : selected.messages.map((m, i) => (
                  <div key={i} className={cn("flex gap-2.5", m.sender === "admin" && "flex-row-reverse")}>
                    <div className={cn("size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      m.sender === "admin" ? "bg-indigo-100" : "bg-slate-100")}>
                      {m.sender === "admin"
                        ? <ShieldCheck className="size-3.5 text-indigo-600" />
                        : <User className="size-3.5 text-slate-600" />}
                    </div>
                    <div className={cn("max-w-[78%] rounded-2xl px-3 py-2 text-sm",
                      m.sender === "admin"
                        ? "bg-indigo-600 text-white rounded-tr-sm"
                        : "bg-slate-100 text-slate-800 rounded-tl-sm")}>
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      <p className={cn("text-[10px] mt-1 opacity-60",
                        m.sender === "admin" ? "text-right" : "")}>
                        {new Date(m.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Reply box */}
              {selected.status !== "closed" && (
                <div className="border-t p-3 flex gap-2">
                  <Textarea
                    rows={2}
                    placeholder="Type your reply…"
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    className="resize-none text-sm flex-1"
                  />
                  <Button onClick={() => handleSend()} disabled={sending || !reply.trim()}
                    className="self-end bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 h-9">
                    <Send className="size-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
