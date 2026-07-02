"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Plus, Loader2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Conversation = {
  id: string;
  subject: string;
  status: "open" | "resolved" | "closed";
  lastMessage: string;
  messageCount: number;
  updatedAt: string;
};

type Message = {
  sender: "user" | "admin";
  text: string;
  createdAt: string;
};

export default function SupportChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newText, setNewText] = useState("");
  const [creating, setCreating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchConversations() {
    setLoadingList(true);
    const res = await fetch("/api/support/conversations");
    const data = await res.json();
    if (data.conversations) setConversations(data.conversations);
    setLoadingList(false);
  }

  async function openConversation(id: string) {
    setActiveId(id);
    setLoadingMessages(true);
    const res = await fetch(`/api/support/conversations/${id}`);
    const data = await res.json();
    if (data.messages) setMessages(data.messages);
    setLoadingMessages(false);
  }

  async function sendReply() {
    if (!reply.trim() || !activeId) return;
    setSending(true);
    const res = await fetch(`/api/support/conversations/${activeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: reply }),
    });
    if (res.ok) {
      setMessages((prev) => [...prev, { sender: "user", text: reply, createdAt: new Date().toISOString() }]);
      setReply("");
    }
    setSending(false);
  }

  async function createConversation() {
    if (!newSubject.trim() || !newText.trim()) return;
    setCreating(true);
    const res = await fetch("/api/support/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: newSubject, text: newText }),
    });
    const data = await res.json();
    if (res.ok && data.id) {
      setShowNew(false);
      setNewSubject("");
      setNewText("");
      await fetchConversations();
      openConversation(data.id);
    }
    setCreating(false);
  }

  // Conversation list view
  if (!activeId && !showNew) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{conversations.length} conversation{conversations.length !== 1 ? "s" : ""}</p>
          <Button onClick={() => setShowNew(true)} className="rounded-full gap-2" size="sm">
            <Plus className="h-4 w-4" /> New conversation
          </Button>
        </div>

        {loadingList ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-300 py-16 text-center">
            <MessageCircle className="h-10 w-10 text-slate-300" />
            <p className="text-slate-500">No conversations yet. Start one to get help.</p>
            <Button onClick={() => setShowNew(true)} className="rounded-full" size="sm">
              <Plus className="h-4 w-4 mr-1" /> Start a conversation
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((c) => (
              <Card
                key={c.id}
                className="cursor-pointer border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all"
                onClick={() => openConversation(c.id)}
              >
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-slate-900 truncate">{c.subject}</p>
                      <Badge
                        className={c.status === "open" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}
                        variant="secondary"
                      >
                        {c.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 truncate">{c.lastMessage || "No messages yet"}</p>
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // New conversation form
  if (showNew) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowNew(false)} className="rounded-full h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base">New conversation</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Subject</label>
            <Input
              placeholder="e.g. Booking cancellation help"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Message</label>
            <textarea
              placeholder="Describe your issue..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <Button
            onClick={createConversation}
            disabled={creating || !newSubject.trim() || !newText.trim()}
            className="w-full rounded-xl"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Send message
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Chat thread view
  return (
    <Card className="border-slate-200 flex flex-col" style={{ height: "520px" }}>
      <CardHeader className="border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setActiveId(null); fetchConversations(); }} className="rounded-full h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-base truncate">
            {conversations.find((c) => c.id === activeId)?.subject ?? "Conversation"}
          </CardTitle>
        </div>
      </CardHeader>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loadingMessages ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">No messages yet.</p>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.sender === "user"
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-slate-100 text-slate-800 rounded-bl-sm"
                }`}
              >
                {msg.sender === "admin" && (
                  <p className="text-xs font-semibold text-indigo-600 mb-0.5">Support</p>
                )}
                <p>{msg.text}</p>
                <p className={`text-xs mt-1 ${msg.sender === "user" ? "text-indigo-200" : "text-slate-400"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="border-t border-slate-100 p-3 flex gap-2">
        <Input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
          placeholder="Type a message…"
          className="rounded-full flex-1 text-sm"
          disabled={sending}
        />
        <Button
          size="icon"
          onClick={sendReply}
          disabled={sending || !reply.trim()}
          className="rounded-full h-10 w-10 shrink-0"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </Card>
  );
}
