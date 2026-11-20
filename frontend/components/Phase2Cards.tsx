"use client";

import {
  ArrowRight,
  BookMarked,
  Check,
  CircleCheck,
  CircleX,
  Eye,
  Lightbulb,
  RotateCcw,
} from "lucide-react";
import { useMemo, useState } from "react";

import { recordPhase2Result } from "@/lib/storage";
import type { CardDifficulty, CardType, ModuleId, Phase2Card } from "@/lib/types";
import { cn } from "@/lib/utils";

import { Badge, Panel, buttonStyles, type BadgeTone } from "./ui";
import { usePublishTutorContext } from "./TutorContextProvider";

interface CardOutcome {
  correct: boolean;
  /** Opción elegida en un quiz; `null` en las flashcards (autoevaluación). */
  selectedIndex: number | null;
}

type Outcomes = Record<string, CardOutcome>;

const CARD_TYPE_LABELS: Record<CardType, string> = {
  FLASHCARD: "Flashcard",
  CONCEPT_QUIZ: "Quiz conceptual",
  CALCULATION_QUIZ: "Quiz de cálculo",
};

const DIFFICULTY: Record<CardDifficulty, { label: string; tone: BadgeTone }> = {
  BASICO: { label: "Básico", tone: "emerald" },
  INTERMEDIO: { label: "Intermedio", tone: "sky" },
  DESAFIO: { label: "Desafío", tone: "amber" },
};

const OPTION_PREFIX = /^([A-Z])\)\s*/;

function splitOption(option: string, index: number): { letter: string; text: string } {
  const match = OPTION_PREFIX.exec(option);
  return match
    ? { letter: match[1], text: option.slice(match[0].length) }
    : { letter: String.fromCharCode(65 + index), text: option };
}

function countCorrect(cards: readonly Phase2Card[], outcomes: Outcomes): number {
  return cards.filter((card) => outcomes[card.card_id]?.correct).length;
}

function Explanation({ card }: { card: Phase2Card }) {
  return (
    <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
        Respuesta y fundamento
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-100 tabular-nums">
        {card.back_explanation}
      </p>
      <p className="mt-3 flex items-start gap-2 text-xs text-slate-400">
        <BookMarked className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{card.source_reference}</span>
      </p>
    </div>
  );
}

function Hint({ hint }: { hint: string }) {
  const [visible, setVisible] = useState(false);
  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-sky-300 hover:text-sky-200"
      >
        <Lightbulb className="h-4 w-4" aria-hidden />
        Ver pista
      </button>
    );
  }
  return (
    <p className="mt-4 flex items-start gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-100">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden />
      <span>{hint}</span>
    </p>
  );
}

function FlashcardBody({
  card,
  onAssess,
}: {
  card: Phase2Card;
  onAssess: (mastered: boolean) => void;
}) {
  const [revealed, setRevealed] = useState(false);

  if (!revealed) {
    return (
      <>
        <Hint hint={card.hint} />
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className={cn(buttonStyles.primary, "mt-6")}
        >
          <Eye className="h-4 w-4" aria-hidden />
          Ver respuesta y fundamento
        </button>
      </>
    );
  }
  return (
    <>
      <Explanation card={card} />
      <p className="mt-5 text-sm font-medium text-slate-300">Autoevaluación de la respuesta:</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" onClick={() => onAssess(true)} className={buttonStyles.primary}>
          <Check className="h-4 w-4" aria-hidden />
          Lo dominé
        </button>
        <button type="button" onClick={() => onAssess(false)} className={buttonStyles.secondary}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          Repasar
        </button>
      </div>
    </>
  );
}

function QuizBody({
  card,
  outcome,
  isLast,
  onSelect,
  onNext,
}: {
  card: Phase2Card;
  outcome: CardOutcome | undefined;
  isLast: boolean;
  onSelect: (index: number) => void;
  onNext: () => void;
}) {
  const answered = outcome !== undefined;

  return (
    <>
      {!answered && <Hint hint={card.hint} />}

      <ul className="mt-5 space-y-3">
        {card.options.map((option, index) => {
          const { letter, text } = splitOption(option, index);
          const isCorrect = index === card.correct_option_index;
          const isSelected = outcome?.selectedIndex === index;
          return (
            <li key={option}>
              <button
                type="button"
                disabled={answered}
                onClick={() => onSelect(index)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left text-sm transition-colors",
                  !answered &&
                    "border-slate-700 bg-slate-900 text-slate-100 hover:border-emerald-400/70 hover:bg-slate-800",
                  answered && isCorrect && "border-emerald-400 bg-emerald-500/15 text-emerald-50",
                  answered && isSelected && !isCorrect && "border-rose-400 bg-rose-500/15 text-rose-50",
                  answered && !isSelected && !isCorrect && "border-slate-800 text-slate-500",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                    answered && isCorrect
                      ? "border-emerald-400 bg-emerald-400 text-slate-950"
                      : answered && isSelected
                        ? "border-rose-400 bg-rose-400 text-slate-950"
                        : "border-slate-600 text-slate-300",
                  )}
                >
                  {letter}
                </span>
                <span className="flex-1 leading-relaxed tabular-nums">{text}</span>
                {answered && isCorrect && (
                  <CircleCheck className="h-5 w-5 shrink-0 text-emerald-300" aria-label="Correcta" />
                )}
                {answered && isSelected && !isCorrect && (
                  <CircleX className="h-5 w-5 shrink-0 text-rose-300" aria-label="Incorrecta" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {answered && (
        <div aria-live="polite">
          <p
            className={cn(
              "mt-5 flex items-center gap-2 text-sm font-semibold",
              outcome.correct ? "text-emerald-300" : "text-rose-300",
            )}
          >
            {outcome.correct ? (
              <CircleCheck className="h-5 w-5" aria-hidden />
            ) : (
              <CircleX className="h-5 w-5" aria-hidden />
            )}
            {outcome.correct ? "Respuesta correcta" : "Respuesta incorrecta"}
          </p>
          <Explanation card={card} />
          <button type="button" onClick={onNext} className={cn(buttonStyles.primary, "mt-5")}>
            {isLast ? "Ver resultados" : "Siguiente tarjeta"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}

function Summary({
  cards,
  outcomes,
  onRetry,
  onContinue,
}: {
  cards: readonly Phase2Card[];
  outcomes: Outcomes;
  onRetry: () => void;
  onContinue: () => void;
}) {
  const score = countCorrect(cards, outcomes);
  const total = cards.length;
  const ratio = score / total;
  const message =
    ratio >= 0.85
      ? "Dominio sólido de los conceptos del módulo."
      : ratio >= 0.6
        ? "Buen nivel. Conviene repasar las tarjetas falladas antes de la simulación."
        : "Conviene volver a la teoría de la Fase 1 y reintentar la práctica.";

  return (
    <Panel>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge tone="emerald">
            <Check className="h-3 w-3" aria-hidden />
            Fase 2 completada
          </Badge>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">
            Resumen de la práctica
          </h2>
          <p className="mt-1.5 text-sm text-slate-300">{message}</p>
        </div>
        <p className="shrink-0 text-right">
          <span className="block text-5xl font-semibold tracking-tight text-white tabular-nums">
            {score}
            <span className="text-2xl text-slate-500"> / {total}</span>
          </span>
          <span className="text-sm text-slate-400 tabular-nums">
            {Math.round(ratio * 100)}% de aciertos
          </span>
        </p>
      </div>

      <ol className="mt-6 divide-y divide-slate-800 rounded-xl border border-slate-800">
        {cards.map((card, index) => {
          const correct = outcomes[card.card_id]?.correct === true;
          return (
            <li key={card.card_id} className="flex items-start gap-3 px-4 py-3 text-sm">
              {correct ? (
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
              ) : (
                <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden />
              )}
              <span className="w-5 shrink-0 text-slate-500 tabular-nums">{index + 1}.</span>
              <span className="line-clamp-2 flex-1 text-slate-300">{card.front_question}</span>
              <span className="hidden shrink-0 text-xs text-slate-500 sm:block">
                {CARD_TYPE_LABELS[card.card_type]}
              </span>
              <span className="sr-only">{correct ? "Acertada" : "Para repasar"}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={onContinue} className={buttonStyles.primary}>
          Continuar a la Fase 3
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" onClick={onRetry} className={buttonStyles.secondary}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          Reintentar la práctica
        </button>
      </div>
    </Panel>
  );
}

export function Phase2Cards({
  moduleId,
  moduleTitle,
  cards,
  onContinue,
}: {
  moduleId: ModuleId;
  moduleTitle: string;
  cards: readonly Phase2Card[];
  onContinue: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcomes>({});
  const [finished, setFinished] = useState(false);

  const total = cards.length;
  const card = cards[index];
  const question = finished ? undefined : card?.front_question;
  const tutorContext = useMemo(() => ({
    phase: 2 as const, module_id: moduleId, module_title: moduleTitle, active_card_question: question,
  }), [moduleId, moduleTitle, question]);
  usePublishTutorContext(tutorContext);

  function record(outcome: CardOutcome): Outcomes {
    const next = { ...outcomes, [card.card_id]: outcome };
    setOutcomes(next);
    return next;
  }

  function advance(current: Outcomes) {
    if (index + 1 < total) {
      setIndex(index + 1);
      return;
    }
    recordPhase2Result(moduleId, countCorrect(cards, current), total);
    setFinished(true);
  }

  function retry() {
    setIndex(0);
    setOutcomes({});
    setFinished(false);
  }

  if (finished) {
    return <Summary cards={cards} outcomes={outcomes} onRetry={retry} onContinue={onContinue} />;
  }

  const difficulty = DIFFICULTY[card.difficulty];
  const correctSoFar = countCorrect(cards, outcomes);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-300">
            Tarjeta{" "}
            <span className="font-semibold text-white tabular-nums">
              {index + 1} / {total}
            </span>
          </span>
          <span className="text-slate-400 tabular-nums">
            {correctSoFar} {correctSoFar === 1 ? "acierto" : "aciertos"}
          </span>
        </div>
        <ol className="mt-2 flex gap-1.5" aria-hidden>
          {cards.map((item, itemIndex) => {
            const outcome = outcomes[item.card_id];
            return (
              <li
                key={item.card_id}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  outcome === undefined && "bg-slate-800",
                  outcome?.correct === true && "bg-emerald-400",
                  outcome?.correct === false && "bg-rose-400",
                  itemIndex === index && outcome === undefined && "bg-slate-500",
                )}
              />
            );
          })}
        </ol>
      </div>

      {/* La clave reinicia el estado local (pista, respuesta revelada) al cambiar de tarjeta. */}
      <Panel key={card.card_id}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{CARD_TYPE_LABELS[card.card_type]}</Badge>
          <Badge tone={difficulty.tone}>{difficulty.label}</Badge>
        </div>
        <h2 className="mt-4 text-lg leading-relaxed font-medium text-white tabular-nums">
          {card.front_question}
        </h2>

        {card.card_type === "FLASHCARD" ? (
          <FlashcardBody
            card={card}
            onAssess={(mastered) => advance(record({ correct: mastered, selectedIndex: null }))}
          />
        ) : (
          <QuizBody
            card={card}
            outcome={outcomes[card.card_id]}
            isLast={index + 1 === total}
            onSelect={(selectedIndex) =>
              record({ correct: selectedIndex === card.correct_option_index, selectedIndex })
            }
            onNext={() => advance(outcomes)}
          />
        )}
      </Panel>
    </div>
  );
}
