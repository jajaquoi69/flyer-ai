"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

interface Session {
  id: string;
  title: string;
  startedAt: number;
  messages: Msg[];
  mood?: string;
}

interface Profile {
  summary: string;
  updatedAt: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MOODS = [
  { emoji: "😔", label: "Triste" },
  { emoji: "😰", label: "Anxieux·se" },
  { emoji: "😤", label: "Stressé·e" },
  { emoji: "😠", label: "En colère" },
  { emoji: "😴", label: "Épuisé·e" },
  { emoji: "😐", label: "Neutre" },
  { emoji: "🙂", label: "Bien" },
  { emoji: "😊", label: "Heureux·se" },
];

const SK = {
  SESSIONS: "psy_sessions",
  CURRENT: "psy_current",
  PROFILE: "psy_profile",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

// ── Component ─────────────────────────────────────────────────────────────────

export default function PsyPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [current, setCurrent] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>({ summary: "", updatedAt: 0 });
  const [phase, setPhase] = useState<"mood" | "chat">("mood");
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const savedSessions: Session[] = JSON.parse(
        localStorage.getItem(SK.SESSIONS) || "[]"
      );
      const savedProfile: Profile = JSON.parse(
        localStorage.getItem(SK.PROFILE) ||
          '{"summary":"","updatedAt":0}'
      );
      const savedCurrent: Session | null = JSON.parse(
        localStorage.getItem(SK.CURRENT) || "null"
      );

      setSessions(savedSessions);
      setProfile(savedProfile);
      profileRef.current = savedProfile;

      if (savedCurrent && savedCurrent.messages.length > 0) {
        setCurrent(savedCurrent);
        setPhase("chat");
      } else {
        const fresh: Session = {
          id: uid(),
          title: "Nouvelle session",
          startedAt: Date.now(),
          messages: [],
        };
        setCurrent(fresh);
        localStorage.setItem(SK.CURRENT, JSON.stringify(fresh));
      }
    } catch {}
    setMounted(true);
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [current?.messages.length]);

  // ── Persistence ──────────────────────────────────────────────────────────

  const saveCurrent = useCallback((s: Session) => {
    localStorage.setItem(SK.CURRENT, JSON.stringify(s));
  }, []);

  // ── Session finalization ─────────────────────────────────────────────────

  const finalizeSession = useCallback(async (session: Session) => {
    if (session.messages.length === 0) return;

    setSessions((prev) => {
      const updated = [
        session,
        ...prev.filter((s) => s.id !== session.id),
      ].slice(0, 40);
      localStorage.setItem(SK.SESSIONS, JSON.stringify(updated));
      return updated;
    });

    try {
      const res = await fetch("/api/therapist/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: session.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          existingProfile: profileRef.current.summary,
        }),
      });
      if (res.ok) {
        const { summary } = await res.json();
        const p: Profile = { summary, updatedAt: Date.now() };
        setProfile(p);
        profileRef.current = p;
        localStorage.setItem(SK.PROFILE, JSON.stringify(p));
      }
    } catch {}
  }, []);

  // ── Streaming core ───────────────────────────────────────────────────────

  const streamResponse = useCallback(
    async (
      base: Session,
      apiMessages: Array<{ role: "user" | "assistant"; content: string }>,
      mood: string
    ) => {
      const streamId = uid();
      const placeholder: Msg = {
        id: streamId,
        role: "assistant",
        content: "",
        ts: Date.now(),
      };

      setCurrent((prev) =>
        prev ? { ...prev, messages: [...prev.messages, placeholder] } : prev
      );
      setStreaming(true);

      let accumulated = "";

      try {
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        const res = await fetch("/api/therapist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify({
            messages: apiMessages,
            userProfile: profileRef.current.summary,
            currentMood: mood,
          }),
        });

        if (!res.ok || !res.body) throw new Error("API error");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setCurrent((prev) =>
            prev
              ? {
                  ...prev,
                  messages: prev.messages.map((m) =>
                    m.id === streamId ? { ...m, content: accumulated } : m
                  ),
                }
              : prev
          );
        }
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          const fallback =
            "Désolé, une erreur s'est produite. Réessaie dans un instant.";
          accumulated = fallback;
          setCurrent((prev) =>
            prev
              ? {
                  ...prev,
                  messages: prev.messages.map((m) =>
                    m.id === streamId ? { ...m, content: fallback } : m
                  ),
                }
              : prev
          );
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
        setCurrent((prev) => {
          if (prev) saveCurrent(prev);
          return prev;
        });
      }
    },
    [saveCurrent]
  );

  // ── Mood selection → initial greeting ────────────────────────────────────

  const handleMoodSelect = useCallback(
    async (moodLabel: string) => {
      if (!current) return;
      const updated: Session = { ...current, mood: moodLabel, messages: [] };
      setCurrent(updated);
      saveCurrent(updated);
      setPhase("chat");
      await streamResponse(updated, [], moodLabel);
    },
    [current, saveCurrent, streamResponse]
  );

  // ── Send a user message ──────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!current || !input.trim() || streaming) return;

    const userMsg: Msg = {
      id: uid(),
      role: "user",
      content: input.trim(),
      ts: Date.now(),
    };

    const isFirstUserMsg =
      current.messages.filter((m) => m.role === "user").length === 0;

    const updated: Session = {
      ...current,
      title: isFirstUserMsg ? input.trim().slice(0, 60) : current.title,
      messages: [...current.messages, userMsg],
    };

    setCurrent(updated);
    saveCurrent(updated);
    setInput("");

    if (textRef.current) textRef.current.style.height = "auto";

    const apiMessages = updated.messages
      .filter((m) => m.content !== "")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    await streamResponse(updated, apiMessages, current.mood ?? "");
  }, [current, input, streaming, saveCurrent, streamResponse]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── New session ──────────────────────────────────────────────────────────

  const handleNewSession = useCallback(async () => {
    if (current && current.messages.length > 0) {
      await finalizeSession(current);
    }
    const fresh: Session = {
      id: uid(),
      title: "Nouvelle session",
      startedAt: Date.now(),
      messages: [],
    };
    setCurrent(fresh);
    saveCurrent(fresh);
    setPhase("mood");
    setSidebarOpen(false);
  }, [current, finalizeSession, saveCurrent]);

  // ── Load past session ────────────────────────────────────────────────────

  const handleLoad = useCallback(
    async (session: Session) => {
      if (current && current.messages.length > 0 && current.id !== session.id) {
        await finalizeSession(current);
      }
      setCurrent(session);
      saveCurrent(session);
      setPhase("chat");
      setSidebarOpen(false);
    },
    [current, finalizeSession, saveCurrent]
  );

  // ── End session ──────────────────────────────────────────────────────────

  const handleEnd = useCallback(async () => {
    if (!current) return;
    await finalizeSession(current);
    const fresh: Session = {
      id: uid(),
      title: "Nouvelle session",
      startedAt: Date.now(),
      messages: [],
    };
    setCurrent(fresh);
    saveCurrent(fresh);
    setPhase("mood");
  }, [current, finalizeSession, saveCurrent]);

  // ── Pre-mount (SSR guard) ─────────────────────────────────────────────────

  if (!mounted) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 150, 300].map((d) => (
            <div
              key={d}
              className="h-2 w-2 animate-bounce rounded-full bg-purple-400/60"
              style={{ animationDelay: `${d}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur-sm">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white transition md:hidden"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <span>Sessions</span>
        </button>

        {/* Identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/40 to-rose-400/30 text-lg shadow-lg shadow-purple-500/20">
            💜
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-white">Elia</p>
            <p className="text-[11px] text-white/45">
              {current?.mood ? `Humeur : ${current.mood}` : "Ton espace d'écoute"}
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {profile.summary && (
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="hidden rounded-lg px-3 py-1.5 text-xs text-white/55 hover:bg-white/10 hover:text-white transition md:block"
            >
              Mon profil
            </button>
          )}
          {phase === "chat" && (
            <button
              onClick={handleEnd}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/55 hover:border-purple-400/40 hover:text-white transition"
            >
              Terminer
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="absolute inset-0 z-20 bg-black/70 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        <aside
          className={`
            absolute inset-y-0 left-0 z-30 flex w-72 flex-col
            border-r border-white/10 bg-[#08090f]/95 backdrop-blur-xl
            transition-transform duration-300
            md:relative md:translate-x-0
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <div className="flex items-center justify-between p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">
              Sessions
            </h3>
            <button
              onClick={handleNewSession}
              className="flex items-center gap-1 rounded-lg bg-purple-500/20 px-3 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-500/30 transition"
            >
              + Nouvelle
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {/* Current session */}
            {current && current.messages.length > 0 && (
              <div className="mb-3">
                <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-white/25">
                  En cours
                </p>
                <div className="rounded-xl bg-purple-500/10 px-3 py-3 ring-1 ring-purple-400/25">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-xs font-medium text-white/90">
                      {current.title}
                    </p>
                    {current.mood && (
                      <span className="flex-shrink-0 text-sm">
                        {current.mood.split(" ")[0]}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-white/35">
                    {fmtDate(current.startedAt)}
                  </p>
                  <p className="text-[10px] text-white/25">
                    {current.messages.length} messages
                  </p>
                </div>
              </div>
            )}

            {/* History */}
            {sessions.length > 0 && (
              <div>
                <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-white/25">
                  Historique
                </p>
                <ul className="space-y-0.5">
                  {sessions.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => handleLoad(s)}
                        className="w-full rounded-xl px-3 py-3 text-left hover:bg-white/8 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-xs text-white/70">{s.title}</p>
                          {s.mood && (
                            <span className="flex-shrink-0 text-xs">
                              {s.mood.split(" ")[0]}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-white/35">
                          {fmtDate(s.startedAt)} · {s.messages.length} messages
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {sessions.length === 0 &&
              (!current || current.messages.length === 0) && (
                <p className="px-3 py-8 text-center text-xs text-white/25">
                  Tes sessions apparaîtront ici
                </p>
              )}
          </div>

          {/* Profile snippet at bottom of sidebar */}
          {profile.summary && (
            <div className="border-t border-white/10 p-4">
              <p className="text-[10px] uppercase tracking-wide text-white/35">
                Ce qu'Elia retient
              </p>
              <p className="mt-1.5 line-clamp-4 text-[11px] leading-relaxed text-white/50">
                {profile.summary}
              </p>
              {profile.updatedAt > 0 && (
                <p className="mt-1 text-[9px] text-white/22">
                  Mis à jour le {fmtDate(profile.updatedAt)}
                </p>
              )}
            </div>
          )}
        </aside>

        {/* ── Profile panel (desktop slide-in) ── */}
        {profileOpen && (
          <div className="hidden w-80 flex-col border-l border-white/10 bg-[#08090f]/95 p-6 backdrop-blur-xl md:flex">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Mon profil</h3>
              <button
                onClick={() => setProfileOpen(false)}
                className="text-xl leading-none text-white/35 hover:text-white transition"
              >
                ×
              </button>
            </div>
            {profile.updatedAt > 0 && (
              <p className="mt-1 text-[10px] text-white/30">
                Mis à jour le {fmtDate(profile.updatedAt)}
              </p>
            )}
            <div className="mt-4 flex-1 overflow-y-auto">
              <p className="text-sm leading-relaxed text-white/65">
                {profile.summary ||
                  "Le profil se construira au fil de tes sessions."}
              </p>
            </div>
          </div>
        )}

        {/* ── Main area ── */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Mood picker */}
          {phase === "mood" && (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
              {/* Glow orb */}
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full blur-2xl bg-purple-500/30" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/30 to-rose-400/20 text-4xl shadow-xl shadow-purple-500/20 ring-1 ring-white/10">
                  💜
                </div>
              </div>

              <h2 className="text-2xl font-semibold text-white">
                {profile.summary ? "Content de te retrouver" : "Bonjour"}
              </h2>
              <p className="mt-2 max-w-sm text-center text-sm text-white/55">
                {profile.summary
                  ? "Comment tu te sens aujourd'hui ?"
                  : "Je suis Elia, ton espace d'écoute. Je suis là pour t'accompagner, sans jugement. Comment tu te sens en ce moment ?"}
              </p>

              <div className="mt-8 flex max-w-md flex-wrap justify-center gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.label}
                    onClick={() => handleMoodSelect(`${m.emoji} ${m.label}`)}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-purple-400/40 hover:bg-purple-500/10 hover:text-white active:scale-95"
                  >
                    <span className="text-base">{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Skip mood */}
              <button
                onClick={() => {
                  setPhase("chat");
                  if (current) streamResponse(current, [], "");
                }}
                className="mt-6 text-xs text-white/25 hover:text-white/50 transition"
              >
                Passer →
              </button>
            </div>
          )}

          {/* Chat */}
          {phase === "chat" && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
                <div className="mx-auto max-w-2xl space-y-5">
                  {current?.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm ${
                          msg.role === "assistant"
                            ? "bg-gradient-to-br from-purple-500/40 to-rose-400/30"
                            : "bg-gradient-to-br from-indigo-500/30 to-blue-400/20"
                        }`}
                      >
                        {msg.role === "assistant" ? "💜" : "🙂"}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`flex max-w-[78%] flex-col gap-1 ${
                          msg.role === "user" ? "items-end" : ""
                        }`}
                      >
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            msg.role === "assistant"
                              ? "border border-white/10 bg-white/6 text-white/90"
                              : "border border-indigo-400/20 bg-indigo-500/20 text-white"
                          }`}
                        >
                          {msg.content === "" ? (
                            <span className="flex items-center gap-1.5 text-white/35">
                              {[0, 120, 240].map((d) => (
                                <span
                                  key={d}
                                  className="animate-bounce inline-block h-1.5 w-1.5 rounded-full bg-purple-400/60"
                                  style={{ animationDelay: `${d}ms` }}
                                />
                              ))}
                            </span>
                          ) : (
                            msg.content.split("\n").map((line, i, arr) => (
                              <React.Fragment key={i}>
                                {line}
                                {i < arr.length - 1 && <br />}
                              </React.Fragment>
                            ))
                          )}
                        </div>
                        <p className="px-1 text-[10px] text-white/22">
                          {fmtTime(msg.ts)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
              </div>

              {/* Input area */}
              <div className="border-t border-white/10 bg-black/25 px-4 py-4 backdrop-blur-sm">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="mx-auto flex max-w-2xl items-end gap-3"
                >
                  <textarea
                    ref={textRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    onInput={(e) => {
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = "auto";
                      t.style.height = `${Math.min(t.scrollHeight, 140)}px`;
                    }}
                    placeholder="Écris ce que tu ressens…"
                    rows={1}
                    disabled={streaming}
                    className="flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-purple-400/40 focus:outline-none focus:ring-1 focus:ring-purple-400/20 transition disabled:opacity-50"
                    style={{ minHeight: "48px", maxHeight: "140px" }}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || streaming}
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-rose-400 text-white shadow-lg shadow-purple-500/25 transition hover:shadow-purple-500/50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {streaming ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <svg
                        className="h-5 w-5 translate-x-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    )}
                  </button>
                </form>
                <p className="mt-2 text-center text-[10px] text-white/18">
                  Entrée pour envoyer · Shift+Entrée pour sauter une ligne · Elia n'est pas un médecin — urgence : 3114
                </p>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
