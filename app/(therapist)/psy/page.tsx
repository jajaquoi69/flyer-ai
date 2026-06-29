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

type ModelState = "idle" | "loading" | "ready" | "error" | "no-webgpu";

// ── Constants ─────────────────────────────────────────────────────────────────

const MODEL_ID = "Llama-3.2-3B-Instruct-q4f16_1-MLC";

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

const SK = { SESSIONS: "psy_sessions", CURRENT: "psy_current", PROFILE: "psy_profile" };

// ── Helpers ───────────────────────────────────────────────────────────────────

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function buildSystem(profile: string, mood: string): string {
  const lines = [
    "Tu es Elia, un compagnon d'écoute psychologique bienveillant et empathique.",
    "Tu accompagnes cette personne avec chaleur et sans jugement.",
    "Tu utilises l'écoute active, la reformulation et des questions ouvertes.",
    "",
    "Règles absolues :",
    "- Réponds TOUJOURS en français",
    "- Réponses courtes (2-3 phrases max), sauf si plus de profondeur est nécessaire",
    "- Valide les émotions avant tout",
    "- Termine souvent par une question douce",
    "- Ne donne jamais de conseils médicaux directs",
    "- En cas de détresse grave, mentionne le 3114",
  ];
  if (profile) lines.push("", "Ce que tu sais sur cette personne :", profile);
  else lines.push("", "Première rencontre — présente-toi en une phrase et invite à parler.");
  if (mood) lines.push("", `Humeur actuelle : ${mood}`, "Accueille cette humeur avec empathie.");
  return lines.join("\n");
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PsyPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [current, setCurrent] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>({ summary: "", updatedAt: 0 });
  const [phase, setPhase] = useState<"mood" | "loading" | "chat">("mood");
  const [modelState, setModelState] = useState<ModelState>("idle");
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadText, setLoadText] = useState("Initialisation…");
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const engineRef = useRef<any>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const abortRef = useRef(false);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const s: Session[] = JSON.parse(localStorage.getItem(SK.SESSIONS) || "[]");
      const p: Profile = JSON.parse(localStorage.getItem(SK.PROFILE) || '{"summary":"","updatedAt":0}');
      const c: Session | null = JSON.parse(localStorage.getItem(SK.CURRENT) || "null");
      setSessions(s);
      setProfile(p);
      profileRef.current = p;
      if (c && c.messages.length > 0) { setCurrent(c); setPhase("loading"); initModel(c, c.mood ?? ""); }
      else { const fresh = mkSession(); setCurrent(fresh); save(fresh); }
    } catch {}
    setMounted(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [current?.messages.length]);

  // ── Persistence ──────────────────────────────────────────────────────────

  const mkSession = (): Session => ({ id: uid(), title: "Nouvelle session", startedAt: Date.now(), messages: [] });
  const save = (s: Session) => localStorage.setItem(SK.CURRENT, JSON.stringify(s));

  // ── WebLLM model loading ─────────────────────────────────────────────────

  const initModel = useCallback(async (sessionAfterLoad: Session, mood: string) => {
    if (engineRef.current) {
      setPhase("chat");
      if (sessionAfterLoad.messages.length === 0) runGreeting(sessionAfterLoad, mood);
      return;
    }

    if (typeof navigator === "undefined" || !("gpu" in navigator)) {
      setModelState("no-webgpu");
      setPhase("loading");
      return;
    }

    setModelState("loading");
    setPhase("loading");

    try {
      const { MLCEngine } = await import("@mlc-ai/web-llm");
      const engine = new MLCEngine();
      engine.setInitProgressCallback((report: { progress: number; text: string }) => {
        setLoadProgress(Math.round(report.progress * 100));
        setLoadText(report.text || "Chargement du modèle…");
      });
      await engine.reload(MODEL_ID);
      engineRef.current = engine;
      setModelState("ready");
      setPhase("chat");
      if (sessionAfterLoad.messages.length === 0) runGreeting(sessionAfterLoad, mood);
    } catch (err) {
      console.error("WebLLM load error:", err);
      setModelState("error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Core streaming ───────────────────────────────────────────────────────

  const runStream = useCallback(
    async (base: Session, apiMsgs: Array<{ role: "user" | "assistant"; content: string }>, mood: string) => {
      const engine = engineRef.current;
      if (!engine) return;

      const id = uid();
      const placeholder: Msg = { id, role: "assistant", content: "", ts: Date.now() };
      setCurrent((p) => p ? { ...p, messages: [...p.messages, placeholder] } : p);
      setStreaming(true);
      abortRef.current = false;

      let acc = "";
      try {
        const systemMsg = buildSystem(profileRef.current.summary, mood);
        const gen = await engine.chat.completions.create({
          messages: [{ role: "system", content: systemMsg }, ...apiMsgs],
          stream: true,
          max_tokens: 400,
          temperature: 0.85,
        });
        for await (const chunk of gen) {
          if (abortRef.current) break;
          acc += chunk.choices[0]?.delta?.content ?? "";
          setCurrent((p) => p ? { ...p, messages: p.messages.map((m) => m.id === id ? { ...m, content: acc } : m) } : p);
        }
      } catch (err) {
        const msg = "Désolé, une erreur s'est produite. Réessaie.";
        acc = msg;
        setCurrent((p) => p ? { ...p, messages: p.messages.map((m) => m.id === id ? { ...m, content: msg } : m) } : p);
        console.error(err);
      } finally {
        setStreaming(false);
        setCurrent((p) => { if (p) save(p); return p; });
      }
    },
    []
  );

  const runGreeting = useCallback((session: Session, mood: string) => {
    runStream(session, [], mood);
  }, [runStream]);

  // ── Finalize session → update profile ────────────────────────────────────

  const finalizeSession = useCallback(async (session: Session) => {
    if (session.messages.length === 0) return;

    setSessions((prev) => {
      const updated = [session, ...prev.filter((s) => s.id !== session.id)].slice(0, 40);
      localStorage.setItem(SK.SESSIONS, JSON.stringify(updated));
      return updated;
    });

    const engine = engineRef.current;
    if (!engine) return;

    try {
      const convo = session.messages
        .map((m) => `${m.role === "user" ? "Moi" : "Elia"}: ${m.content}`)
        .join("\n");
      const existing = profileRef.current.summary;
      const prompt = existing
        ? `Profil actuel :\n${existing}\n\nNouvelle conversation :\n${convo}\n\nMets à jour le profil (max 200 mots) :`
        : `Conversation :\n${convo}\n\nRésume ce que tu as appris sur cette personne (max 150 mots) :`;

      const res = await engine.chat.completions.create({
        messages: [
          { role: "system", content: "Tu résumes des informations sur une personne pour aider un compagnon d'écoute à mieux la connaître. Sois factuel et bienveillant." },
          { role: "user", content: prompt },
        ],
        max_tokens: 250,
        temperature: 0.3,
      });
      const summary = res.choices[0]?.message?.content ?? "";
      if (summary) {
        const p: Profile = { summary, updatedAt: Date.now() };
        setProfile(p);
        profileRef.current = p;
        localStorage.setItem(SK.PROFILE, JSON.stringify(p));
      }
    } catch (err) {
      console.error("Summarize error:", err);
    }
  }, []);

  // ── Mood selection ────────────────────────────────────────────────────────

  const handleMoodSelect = useCallback(async (moodLabel: string) => {
    if (!current) return;
    const updated: Session = { ...current, mood: moodLabel, messages: [] };
    setCurrent(updated);
    save(updated);
    await initModel(updated, moodLabel);
  }, [current, initModel]);

  // ── Send message ─────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!current || !input.trim() || streaming) return;
    const isFirst = current.messages.filter((m) => m.role === "user").length === 0;
    const userMsg: Msg = { id: uid(), role: "user", content: input.trim(), ts: Date.now() };
    const updated: Session = {
      ...current,
      title: isFirst ? input.trim().slice(0, 60) : current.title,
      messages: [...current.messages, userMsg],
    };
    setCurrent(updated);
    save(updated);
    setInput("");
    if (textRef.current) textRef.current.style.height = "auto";
    const apiMsgs = updated.messages
      .filter((m) => m.content !== "")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    await runStream(updated, apiMsgs, current.mood ?? "");
  }, [current, input, streaming, runStream]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Session management ───────────────────────────────────────────────────

  const handleNewSession = useCallback(async () => {
    if (current && current.messages.length > 0) await finalizeSession(current);
    const fresh = mkSession();
    setCurrent(fresh);
    save(fresh);
    setPhase("mood");
    setSidebarOpen(false);
  }, [current, finalizeSession]);

  const handleLoad = useCallback(async (session: Session) => {
    if (current && current.messages.length > 0 && current.id !== session.id) await finalizeSession(current);
    setCurrent(session);
    save(session);
    setPhase(engineRef.current ? "chat" : "loading");
    if (!engineRef.current) initModel(session, session.mood ?? "");
    setSidebarOpen(false);
  }, [current, finalizeSession, initModel]);

  const handleEnd = useCallback(async () => {
    if (!current) return;
    await finalizeSession(current);
    const fresh = mkSession();
    setCurrent(fresh);
    save(fresh);
    setPhase("mood");
  }, [current, finalizeSession]);

  // ── Guard ─────────────────────────────────────────────────────────────────

  if (!mounted) return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex gap-1.5">
        {[0, 150, 300].map((d) => (
          <div key={d} className="h-2 w-2 animate-bounce rounded-full bg-purple-400/60" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur-sm">
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white transition md:hidden"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          Sessions
        </button>

        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/40 to-rose-400/30 text-lg shadow-lg shadow-purple-500/20">
            💜
            {modelState === "ready" && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#02030a] bg-emerald-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-white">Elia</p>
            <p className="text-[11px] text-white/45">
              {modelState === "loading"
                ? `Chargement ${loadProgress}%`
                : current?.mood
                ? `Humeur : ${current.mood}`
                : "Ton espace d'écoute · 100% privé"}
            </p>
          </div>
        </div>

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
        {sidebarOpen && (
          <div className="absolute inset-0 z-20 bg-black/70 md:hidden" onClick={() => setSidebarOpen(false)} />
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
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">Sessions</h3>
            <button
              onClick={handleNewSession}
              className="flex items-center gap-1 rounded-lg bg-purple-500/20 px-3 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-500/30 transition"
            >
              + Nouvelle
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {current && current.messages.length > 0 && (
              <div className="mb-3">
                <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-white/25">En cours</p>
                <div className="rounded-xl bg-purple-500/10 px-3 py-3 ring-1 ring-purple-400/25">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-xs font-medium text-white/90">{current.title}</p>
                    {current.mood && <span className="flex-shrink-0 text-sm">{current.mood.split(" ")[0]}</span>}
                  </div>
                  <p className="mt-0.5 text-[10px] text-white/35">{fmtDate(current.startedAt)}</p>
                  <p className="text-[10px] text-white/25">{current.messages.length} messages</p>
                </div>
              </div>
            )}

            {sessions.length > 0 && (
              <div>
                <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-white/25">Historique</p>
                <ul className="space-y-0.5">
                  {sessions.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => handleLoad(s)}
                        className="w-full rounded-xl px-3 py-3 text-left hover:bg-white/8 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-xs text-white/70">{s.title}</p>
                          {s.mood && <span className="flex-shrink-0 text-xs">{s.mood.split(" ")[0]}</span>}
                        </div>
                        <p className="mt-0.5 text-[10px] text-white/35">{fmtDate(s.startedAt)} · {s.messages.length} msg</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {sessions.length === 0 && (!current || current.messages.length === 0) && (
              <p className="px-3 py-8 text-center text-xs text-white/25">Tes sessions apparaîtront ici</p>
            )}
          </div>

          {profile.summary && (
            <div className="border-t border-white/10 p-4">
              <p className="text-[10px] uppercase tracking-wide text-white/35">Ce qu'Elia retient</p>
              <p className="mt-1.5 line-clamp-4 text-[11px] leading-relaxed text-white/50">{profile.summary}</p>
              {profile.updatedAt > 0 && <p className="mt-1 text-[9px] text-white/22">Mis à jour le {fmtDate(profile.updatedAt)}</p>}
            </div>
          )}
        </aside>

        {/* ── Profile panel ── */}
        {profileOpen && (
          <div className="hidden w-80 flex-col border-l border-white/10 bg-[#08090f]/95 p-6 backdrop-blur-xl md:flex">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Mon profil</h3>
              <button onClick={() => setProfileOpen(false)} className="text-xl leading-none text-white/35 hover:text-white transition">×</button>
            </div>
            {profile.updatedAt > 0 && <p className="mt-1 text-[10px] text-white/30">Mis à jour le {fmtDate(profile.updatedAt)}</p>}
            <div className="mt-4 flex-1 overflow-y-auto">
              <p className="text-sm leading-relaxed text-white/65">
                {profile.summary || "Le profil se construira au fil de tes sessions."}
              </p>
            </div>
          </div>
        )}

        {/* ── Main area ── */}
        <main className="flex flex-1 flex-col overflow-hidden">

          {/* ══ Mood picker ══ */}
          {phase === "mood" && (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
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
                  : "Je suis Elia, ton espace d'écoute. Tout se passe ici, sans serveur, complètement privé. Comment tu te sens ?"}
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
              <button
                onClick={() => { setPhase("loading"); initModel(current ?? mkSession(), ""); }}
                className="mt-6 text-xs text-white/25 hover:text-white/50 transition"
              >
                Passer →
              </button>
            </div>
          )}

          {/* ══ Model loading ══ */}
          {phase === "loading" && (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
              {modelState === "no-webgpu" ? (
                <>
                  <div className="mb-4 text-4xl">⚠️</div>
                  <h2 className="text-lg font-semibold text-white">WebGPU non disponible</h2>
                  <p className="mt-2 max-w-sm text-sm text-white/55">
                    Elia a besoin de WebGPU pour fonctionner sans serveur.
                    Utilise <strong>Chrome</strong> ou <strong>Edge</strong> (version récente) sur desktop.
                  </p>
                  <p className="mt-4 text-xs text-white/30">
                    Firefox et Safari mobiles ne supportent pas encore WebGPU.
                  </p>
                </>
              ) : modelState === "error" ? (
                <>
                  <div className="mb-4 text-4xl">❌</div>
                  <h2 className="text-lg font-semibold text-white">Erreur de chargement</h2>
                  <p className="mt-2 max-w-sm text-sm text-white/55">
                    Le modèle n'a pas pu se charger. Vérifie ta connexion et réessaie.
                  </p>
                  <button
                    onClick={() => { setModelState("idle"); setPhase("mood"); }}
                    className="mt-5 rounded-full bg-purple-500/20 px-5 py-2.5 text-sm font-semibold text-purple-200 hover:bg-purple-500/30 transition"
                  >
                    Réessayer
                  </button>
                </>
              ) : (
                <>
                  <div className="relative mb-6">
                    <div className="absolute inset-0 rounded-full blur-2xl bg-purple-500/20" />
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/30 to-rose-400/20 text-3xl shadow-xl shadow-purple-500/20 ring-1 ring-white/10">
                      💜
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-white">Elia se prépare…</h2>
                  <p className="mt-2 max-w-sm text-sm text-white/50">
                    {loadProgress < 5
                      ? "Téléchargement du modèle IA (~1.5 Go). Une seule fois, ensuite c'est instantané."
                      : loadText}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-6 w-full max-w-xs">
                    <div className="flex items-center justify-between text-xs text-white/40 mb-1.5">
                      <span>Chargement</span>
                      <span>{loadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-rose-400 transition-all duration-300"
                        style={{ width: `${loadProgress}%` }}
                      />
                    </div>
                  </div>

                  <p className="mt-5 max-w-xs text-xs text-white/25">
                    Le modèle tourne entièrement sur ton appareil. Aucun de tes messages ne quitte ton navigateur.
                  </p>
                </>
              )}
            </div>
          )}

          {/* ══ Chat ══ */}
          {phase === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
                <div className="mx-auto max-w-2xl space-y-5">
                  {current?.messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm ${
                        msg.role === "assistant"
                          ? "bg-gradient-to-br from-purple-500/40 to-rose-400/30"
                          : "bg-gradient-to-br from-indigo-500/30 to-blue-400/20"
                      }`}>
                        {msg.role === "assistant" ? "💜" : "🙂"}
                      </div>

                      <div className={`flex max-w-[78%] flex-col gap-1 ${msg.role === "user" ? "items-end" : ""}`}>
                        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          msg.role === "assistant"
                            ? "border border-white/10 bg-white/6 text-white/90"
                            : "border border-indigo-400/20 bg-indigo-500/20 text-white"
                        }`}>
                          {msg.content === "" ? (
                            <span className="flex items-center gap-1.5 text-white/35">
                              {[0, 120, 240].map((d) => (
                                <span key={d} className="animate-bounce inline-block h-1.5 w-1.5 rounded-full bg-purple-400/60" style={{ animationDelay: `${d}ms` }} />
                              ))}
                            </span>
                          ) : (
                            msg.content.split("\n").map((line, i, arr) => (
                              <React.Fragment key={i}>{line}{i < arr.length - 1 && <br />}</React.Fragment>
                            ))
                          )}
                        </div>
                        <p className="px-1 text-[10px] text-white/22">{fmtTime(msg.ts)}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
              </div>

              {/* Input */}
              <div className="border-t border-white/10 bg-black/25 px-4 py-4 backdrop-blur-sm">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="mx-auto flex max-w-2xl items-end gap-3">
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
                    {streaming
                      ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      : <svg className="h-5 w-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    }
                  </button>
                </form>
                <p className="mt-2 text-center text-[10px] text-white/18">
                  Tout tourne sur ton appareil · aucun message envoyé à un serveur · urgence : 3114
                </p>
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}
