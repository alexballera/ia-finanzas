import module1 from "@/data/module_1.json";
import module2 from "@/data/module_2.json";
import module3 from "@/data/module_3.json";

import type { CourseModule, FutureModule } from "./types";

// TypeScript infiere `string` y `number` para los literales del JSON; la conversión
// los ajusta a las uniones de `CourseModule` (card_type, difficulty, scenario_id…).
export const MODULES: readonly CourseModule[] = [
  module1 as CourseModule,
  module2 as CourseModule,
  module3 as CourseModule,
];

export const FUTURE_MODULES: readonly FutureModule[] = [
  {
    module_id: 4,
    title: "Valuación de Bonos y Acciones",
    summary:
      "Precio, duration y rendimiento al vencimiento de bonos; modelos de descuento de dividendos y de flujos para acciones.",
    locked: true,
  },
  {
    module_id: 5,
    title: "Capital de Trabajo y Política de Dividendos",
    summary:
      "Ciclo de conversión de caja, financiamiento de corto plazo y decisiones de distribución: dividendos frente a recompras.",
    locked: true,
  },
  {
    module_id: 6,
    title: "Valuación por Múltiplos y M&A",
    summary:
      "Comparables de mercado, EV/EBITDA, primas de control y evaluación de sinergias en fusiones y adquisiciones.",
    locked: true,
  },
];

export function getModuleById(id: string | number): CourseModule | undefined {
  return MODULES.find((courseModule) => String(courseModule.module_id) === String(id));
}
