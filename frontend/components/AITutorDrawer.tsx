"use client";

import { BotMessageSquare, LoaderCircle, Send, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { describeApiError, sendTutorMessage } from "@/lib/api";
import { formatPercent } from "@/lib/format";
import type { AISource, TutorChatMessage, TutorContext } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isRecord } from "@/lib/validation";

import { useTutorContext } from "./TutorContextProvider";
import { Badge, buttonStyles } from "./ui";

const STORAGE_KEY = "cfo-tutor-chat-v1";
const MESSAGE_LIMIT = 2000;
const HISTORY_LIMIT = 60;

interface Conversation {
  messages: ScopedMessage[];
  source: AISource | null;
}

interface ScopedMessage extends TutorChatMessage {
  scope: string;
}

const EMPTY: Conversation = { messages: [], source: null };

function isChatMessage(value: unknown): value is ScopedMessage {
  return isRecord(value)
    && (value.role === "user" || value.role === "assistant")
    && typeof value.content === "string" && value.content.trim() !== ""
    && typeof value.scope === "string";
}

function contextLabel(context: TutorContext): string {
  const label = context.module_id
    ? `Módulo ${context.module_id}${context.phase ? ` · Fase ${context.phase}` : ""}`
    : context.route === "/simulator" ? "Simulador Final"
      : context.route === "/" ? "Inicio" : "Mapa Curricular";
  const snapshot = context.simulation_snapshot;
  return snapshot
    ? `${label} · Q${snapshot.current_quarter} · WACC ${formatPercent(snapshot.wacc, 1)}`
    : label;
}

function initialSuggestions(context: TutorContext): string[] {
  if (context.phase === 2 && context.active_card_question) {
    return ["Dame una pista sin resolver la tarjeta", "¿Qué fórmula o concepto necesito?"];
  }
  if (context.simulation_snapshot) {
    return ["¿Qué dice el ROIC frente al WACC?", "¿Qué indica mi cobertura de intereses?"];
  }
  if (context.module_title) {
    return [`¿Cuál es la idea central de «${context.module_title}»?`, "¿Qué error conviene evitar?"];
  }
  return ["¿Cómo distingo rentabilidad y liquidez?", "¿Qué mide el EVA?"];
}

export function AITutorDrawer() {
  const context = useTutorContext();
  // El historial sigue visible, pero Gemini solo recibe mensajes de la tarjeta o estado actual.
  const scope = JSON.stringify(context);
  const dialog = useRef<HTMLDialogElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);
  const inFlight = useRef(false);
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(EMPTY);
  const [draft, setDraft] = useState("");
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [followups, setFollowups] = useState<{ scope: string; items: string[] } | null>(null);
  const suggestions = followups?.scope === scope && followups.items.length
    ? followups.items
    : initialSuggestions(context);
  const { messages, source } = conversation;

  useEffect(() => {
    if (open && scrollArea.current) scrollArea.current.scrollTop = scrollArea.current.scrollHeight;
  }, [open, messages, pendingMessage]);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: KeyboardEvent) {
      if (event.key === "Escape" && dialog.current?.open) {
        event.preventDefault();
        dialog.current.close();
      }
    }
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [open]);

  function show() {
    if (!loaded.current) {
      loaded.current = true;
      try {
        const saved: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
        if (isRecord(saved) && Array.isArray(saved.messages)) {
          setConversation({
            messages: saved.messages.filter(isChatMessage).slice(-HISTORY_LIMIT),
            source: saved.source === "gemini" || saved.source === "fallback" ? saved.source : null,
          });
        }
      } catch {
        setStorageError(true);
      }
    }
    dialog.current?.showModal();
    setOpen(true);
  }

  function save(next: Conversation) {
    setConversation(next);
    try {
      if (next.messages.length) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else sessionStorage.removeItem(STORAGE_KEY);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }

  function clear() {
    save(EMPTY);
    setDraft("");
    setError(null);
    setFollowups(null);
  }

  async function send(text: string) {
    const content = text.trim();
    if (inFlight.current || !content || content.length > MESSAGE_LIMIT) return;
    inFlight.current = true;
    setPendingMessage(content);
    setDraft("");
    setError(null);
    const next: ScopedMessage[] = [...messages, { role: "user", content, scope }];
    try {
      const answer = await sendTutorMessage({
        context,
        messages: next.filter((message) => message.scope === scope).slice(-10).map((message) => ({
          role: message.role,
          content: Array.from(message.content).slice(0, MESSAGE_LIMIT).join("").trim(),
        })),
      });
      save({
        messages: [...next, { role: "assistant" as const, content: answer.reply, scope }].slice(-HISTORY_LIMIT),
        source: answer.ai_source,
      });
      setFollowups({ scope, items: answer.suggested_followups });
    } catch (failure) {
      setError(describeApiError(failure));
      setDraft(content);
    } finally {
      inFlight.current = false;
      setPendingMessage(null);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(draft);
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-controls="cfo-tutor"
        aria-expanded={open}
        onClick={show}
        className="fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 inline-flex items-center gap-2 rounded-full border border-emerald-500/60 bg-slate-950 px-3 py-2 text-xs font-semibold text-emerald-200 shadow-lg hover:bg-slate-800 sm:right-5 sm:text-sm"
      >
        <BotMessageSquare size={17} aria-hidden />
        Tutor CFO IA
      </button>

      <dialog
        id="cfo-tutor"
        ref={dialog}
        aria-labelledby="cfo-tutor-title"
        aria-describedby="cfo-tutor-context"
        onClose={() => setOpen(false)}
        className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-md overflow-hidden border-l border-slate-700 bg-slate-900 text-slate-100 shadow-2xl backdrop:bg-slate-950/65 open:flex open:flex-col"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-800 p-4">
          <div className="min-w-0">
            <h2 id="cfo-tutor-title" className="font-semibold text-white">Tutor CFO IA</h2>
            <p id="cfo-tutor-context" className="mt-1 text-sm text-slate-300">{contextLabel(context)}</p>
            {source && (
              <div className="mt-2">
                <Badge tone={source === "gemini" ? "emerald" : "neutral"}>
                  {source === "gemini" ? "Gemini AI" : "Modo Reglas"}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
            <button type="button" className={buttonStyles.secondary} aria-label="Limpiar conversación"
              onClick={clear} disabled={pendingMessage !== null || !messages.length}>
              <Trash2 size={16} aria-hidden />
            </button>
            <button type="button" className={buttonStyles.secondary} aria-label="Cerrar tutor"
              onClick={() => dialog.current?.close()}>
              <X size={16} aria-hidden />
            </button>
          </div>
        </header>

        <div ref={scrollArea} role="log" aria-label="Conversación" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {!messages.length && !pendingMessage && (
            <p className="text-sm text-slate-300">
              Consulta conceptos, pide una pista o interpreta los indicadores de tu simulación.
            </p>
          )}
          {messages.map((message, index) => <ChatEntry key={index} {...message} />)}
          {pendingMessage && <ChatEntry role="user" content={pendingMessage} />}
          {pendingMessage && (
            <p className="flex items-center gap-2 text-sm text-slate-300">
              <LoaderCircle className="animate-spin" size={16} aria-hidden /> Preparando respuesta…
            </p>
          )}
        </div>

        <div className="space-y-3 border-t border-slate-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto" aria-label="Consultas sugeridas">
            {suggestions.map((item, index) => (
              <button key={index} type="button" disabled={pendingMessage !== null}
                onClick={() => void send(item)}
                className="rounded-full border border-slate-600 px-3 py-1 text-left text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50">
                {item}
              </button>
            ))}
          </div>
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          {storageError && <p role="status" className="text-xs text-amber-200">No se pudo acceder al historial de esta pestaña.</p>}
          <form onSubmit={submit} className="flex items-end gap-2">
            <label htmlFor="cfo-tutor-message" className="sr-only">Tu pregunta</label>
            <textarea
              id="cfo-tutor-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={MESSAGE_LIMIT}
              rows={2}
              disabled={pendingMessage !== null}
              placeholder="Escribe tu pregunta…"
              className="min-w-0 flex-1 resize-none rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-base"
            />
            <button type="submit" className={buttonStyles.primary} aria-label="Enviar pregunta"
              disabled={pendingMessage !== null || !draft.trim()}>
              <Send size={16} aria-hidden />
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}

function ChatEntry({ role, content }: TutorChatMessage) {
  return (
    <div className={cn(
      "max-w-[95%] space-y-2 rounded-xl px-3 py-2 text-sm leading-relaxed wrap-anywhere",
      role === "user" ? "ml-auto bg-emerald-950" : "bg-slate-800",
    )}>
      <p className="text-xs font-semibold text-slate-300">{role === "user" ? "Tú" : "Tutor"}</p>
      <p className="whitespace-pre-wrap">{content}</p>
    </div>
  );
}
