"use client";

/**
 * Persistencia en `localStorage` (la app no tiene base de datos).
 * Guarda el progreso por módulo, el "Modo Docente / Demo" y las simulaciones en curso.
 * Toda lectura se valida: un valor ausente, corrupto o de otra versión vuelve al estado inicial.
 */

import { useSyncExternalStore } from "react";

import type { ModuleId, PhaseNumber, ScenarioId, SimulationStepResponse } from "./types";
import { SCENARIO_IDS, isRecord, isSimulationStepResponse } from "./validation";

const STORAGE_KEY = "ia-finanzas:state:v1";

export const MODULE_IDS: readonly ModuleId[] = [1, 2, 3];

export interface ModuleProgress {
  phase1Viewed: boolean;
  phase2Completed: boolean;
  /** Mejor puntaje obtenido en la Fase 2; `null` si nunca se terminó. */
  phase2BestScore: number | null;
  phase2Total: number | null;
  phase3Won: boolean;
}

export interface SavedSimulation {
  scenarioId: ScenarioId;
  savedAt: string;
  /** Última respuesta del backend: contiene el estado que se reenvía en el próximo turno. */
  response: SimulationStepResponse;
}

export interface AppState {
  demoMode: boolean;
  modules: Record<ModuleId, ModuleProgress>;
  simulations: Partial<Record<ScenarioId, SavedSimulation>>;
}

const EMPTY_MODULE_PROGRESS: ModuleProgress = {
  phase1Viewed: false,
  phase2Completed: false,
  phase2BestScore: null,
  phase2Total: null,
  phase3Won: false,
};

function createDefaultState(): AppState {
  return {
    demoMode: false,
    modules: {
      1: { ...EMPTY_MODULE_PROGRESS },
      2: { ...EMPTY_MODULE_PROGRESS },
      3: { ...EMPTY_MODULE_PROGRESS },
    },
    simulations: {},
  };
}

const DEFAULT_STATE: AppState = createDefaultState();

// --- Lectura validada --------------------------------------------------------

function parseModuleProgress(value: unknown): ModuleProgress {
  if (!isRecord(value)) {
    return { ...EMPTY_MODULE_PROGRESS };
  }
  const total = value.phase2Total;
  const score = value.phase2BestScore;
  const hasScore =
    typeof total === "number" &&
    typeof score === "number" &&
    Number.isInteger(total) &&
    Number.isInteger(score) &&
    total > 0 &&
    score >= 0 &&
    score <= total;
  return {
    phase1Viewed: value.phase1Viewed === true,
    phase2Completed: value.phase2Completed === true && hasScore,
    phase2BestScore: hasScore ? score : null,
    phase2Total: hasScore ? total : null,
    phase3Won: value.phase3Won === true,
  };
}

function parseSavedSimulation(value: unknown, scenarioId: ScenarioId): SavedSimulation | null {
  // Una partida guardada con otra estructura (versión vieja, edición manual) se descarta entera.
  if (!isRecord(value) || !isSimulationStepResponse(value.response, scenarioId)) {
    return null;
  }
  return {
    scenarioId,
    savedAt: typeof value.savedAt === "string" ? value.savedAt : "",
    response: value.response,
  };
}

function parseState(raw: string | null): AppState {
  if (raw === null) {
    return DEFAULT_STATE;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_STATE;
  }
  if (!isRecord(parsed)) {
    return DEFAULT_STATE;
  }

  const state = createDefaultState();
  state.demoMode = parsed.demoMode === true;
  if (isRecord(parsed.modules)) {
    for (const moduleId of MODULE_IDS) {
      state.modules[moduleId] = parseModuleProgress(parsed.modules[String(moduleId)]);
    }
  }
  if (isRecord(parsed.simulations)) {
    for (const scenarioId of SCENARIO_IDS) {
      const saved = parseSavedSimulation(parsed.simulations[scenarioId], scenarioId);
      if (saved !== null) {
        state.simulations[scenarioId] = saved;
      }
    }
  }
  return state;
}

// --- Store -------------------------------------------------------------------

const listeners = new Set<() => void>();

let cache: { raw: string | null; state: AppState } | null = null;
// Si localStorage no está disponible (modo privado, cuota llena) el estado vive en memoria.
let memoryOnly = false;
let memoryRaw: string | null = null;

function readRaw(): string | null {
  if (memoryOnly) {
    return memoryRaw;
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    memoryOnly = true;
    return memoryRaw;
  }
}

function getSnapshot(): AppState {
  const raw = readRaw();
  // useSyncExternalStore exige la misma referencia mientras el dato no cambie.
  if (cache === null || cache.raw !== raw) {
    cache = { raw, state: parseState(raw) };
  }
  return cache.state;
}

function getServerSnapshot(): AppState {
  return DEFAULT_STATE;
}

function handleStorageEvent(event: StorageEvent): void {
  if (event.key === null || event.key === STORAGE_KEY) {
    listeners.forEach((listener) => listener());
  }
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    window.addEventListener("storage", handleStorageEvent);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", handleStorageEvent);
    }
  };
}

function writeState(next: AppState): void {
  const raw = JSON.stringify(next);
  if (!memoryOnly) {
    try {
      window.localStorage.setItem(STORAGE_KEY, raw);
    } catch {
      memoryOnly = true;
    }
  }
  memoryRaw = raw;
  cache = { raw, state: next };
  listeners.forEach((listener) => listener());
}

function updateState(updater: (current: AppState) => AppState): void {
  if (typeof window === "undefined") {
    return;
  }
  writeState(updater(getSnapshot()));
}

function updateModule(
  moduleId: ModuleId,
  updater: (progress: ModuleProgress) => ModuleProgress,
): void {
  updateState((current) => ({
    ...current,
    modules: { ...current.modules, [moduleId]: updater(current.modules[moduleId]) },
  }));
}

/** Estado persistido; durante el render en servidor y la hidratación devuelve el estado inicial. */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const subscribeNoop = () => () => {};

/** `false` en el servidor y durante la hidratación; `true` cuando ya se leyó `localStorage`. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

// --- Acciones ----------------------------------------------------------------

export function setDemoMode(enabled: boolean): void {
  updateState((current) => ({ ...current, demoMode: enabled }));
}

export function markPhase1Viewed(moduleId: ModuleId): void {
  updateModule(moduleId, (progress) => ({ ...progress, phase1Viewed: true }));
}

/** Registra un intento terminado de la Fase 2 y conserva el mejor puntaje. */
export function recordPhase2Result(moduleId: ModuleId, score: number, total: number): void {
  updateModule(moduleId, (progress) => {
    const isBest =
      progress.phase2BestScore === null ||
      progress.phase2Total !== total ||
      score > progress.phase2BestScore;
    return {
      ...progress,
      phase2Completed: true,
      phase2BestScore: isBest ? score : progress.phase2BestScore,
      phase2Total: total,
    };
  });
}

/**
 * Guarda la última respuesta del backend para retomar la partida al recargar.
 * Si la partida de un módulo terminó en WON, marca además su Fase 3 como ganada.
 */
export function saveSimulation(response: SimulationStepResponse): void {
  const { scenario_id: scenarioId, module_id: moduleId, game_status: status } = response.state.meta;
  const wonModuleId = status === "WON" ? MODULE_IDS.find((id) => id === moduleId) : undefined;
  updateState((current) => ({
    ...current,
    modules:
      wonModuleId === undefined
        ? current.modules
        : {
            ...current.modules,
            [wonModuleId]: { ...current.modules[wonModuleId], phase3Won: true },
          },
    simulations: {
      ...current.simulations,
      [scenarioId]: { scenarioId, savedAt: new Date().toISOString(), response },
    },
  }));
}

/** Descarta la partida guardada de un escenario; el cockpit inicia una nueva. */
export function clearSimulation(scenarioId: ScenarioId): void {
  updateState((current) => {
    const simulations = { ...current.simulations };
    delete simulations[scenarioId];
    return { ...current, simulations };
  });
}

/** Borra el progreso y las simulaciones guardadas; conserva el Modo Docente / Demo. */
export function resetProgress(): void {
  updateState((current) => ({ ...createDefaultState(), demoMode: current.demoMode }));
}

// --- Reglas de avance --------------------------------------------------------

export function isPhaseCompleted(progress: ModuleProgress, phase: PhaseNumber): boolean {
  if (phase === 1) {
    return progress.phase1Viewed;
  }
  if (phase === 2) {
    return progress.phase2Completed;
  }
  return progress.phase3Won;
}

export function countCompletedPhases(progress: ModuleProgress): number {
  return ([1, 2, 3] as const).filter((phase) => isPhaseCompleted(progress, phase)).length;
}

export function isModuleCompleted(progress: ModuleProgress): boolean {
  return countCompletedPhases(progress) === 3;
}

/** Un módulo se habilita al terminar la teoría y la práctica (Fases 1 y 2) del anterior. */
export function isModuleUnlocked(state: AppState, moduleId: ModuleId): boolean {
  if (state.demoMode || moduleId === 1) {
    return true;
  }
  const previous = state.modules[(moduleId - 1) as ModuleId];
  return previous.phase1Viewed && previous.phase2Completed;
}

/** Dentro de un módulo las fases se habilitan en orden. */
export function isPhaseUnlocked(state: AppState, moduleId: ModuleId, phase: PhaseNumber): boolean {
  if (state.demoMode) {
    return true;
  }
  if (!isModuleUnlocked(state, moduleId)) {
    return false;
  }
  return phase === 1 || isPhaseCompleted(state.modules[moduleId], (phase - 1) as PhaseNumber);
}

/** El simulador final exige los tres módulos completos, incluida la Fase 3 ganada. */
export function isSimulatorUnlocked(state: AppState): boolean {
  return (
    state.demoMode || MODULE_IDS.every((moduleId) => isModuleCompleted(state.modules[moduleId]))
  );
}
