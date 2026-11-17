/**
 * Cliente tipado de la API del simulador.
 * Las rutas son relativas: en desarrollo `next.config.ts` las reenvía al backend local
 * y en producción Vercel Services las enruta al servicio `backend`.
 */

import type { ScenarioId, SimulationStepResponse, StepSimulationRequest } from "./types";
import { isRecord, isSimulationStepResponse } from "./validation";

// Margen para el turno más lento: carga en frío del SDK de Gemini más su timeout de 15 s.
// Debe quedar por debajo de `experimental.proxyTimeout` en next.config.ts.
const REQUEST_TIMEOUT_MS = 60_000;

export class ApiError extends Error {
  /** Código HTTP, o `null` si la solicitud no llegó a obtener respuesta. */
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** FastAPI devuelve `detail` como texto (errores del motor) o como lista (validación). */
function readDetail(body: unknown): string | null {
  if (!isRecord(body)) {
    return null;
  }
  const { detail } = body;
  if (typeof detail === "string" && detail.trim() !== "") {
    return detail;
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (isRecord(item) && typeof item.msg === "string" ? item.msg : null))
      .filter((message): message is string => message !== null);
    return messages.length > 0 ? messages.join(" · ") : null;
  }
  return null;
}

async function postSimulation(path: string, payload: unknown): Promise<SimulationStepResponse> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    throw new ApiError(
      timedOut
        ? "El servidor de simulación tardó demasiado en responder. Conviene reintentar."
        : "No se pudo conectar con el servidor de simulación. Verificar que el backend esté en ejecución.",
      null,
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      readDetail(body) ?? `El servidor de simulación respondió con un error (HTTP ${response.status}).`,
      response.status,
    );
  }
  if (!isSimulationStepResponse(body)) {
    throw new ApiError("El servidor de simulación devolvió una respuesta inesperada.", response.status);
  }
  return body;
}

export function initSimulation(scenarioId: ScenarioId): Promise<SimulationStepResponse> {
  return postSimulation("/api/simulation/init", { scenario_id: scenarioId });
}

export function stepSimulation(payload: StepSimulationRequest): Promise<SimulationStepResponse> {
  return postSimulation("/api/simulation/step", payload);
}

export function describeApiError(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "Ocurrió un error inesperado al contactar al servidor de simulación.";
}
