import module1 from "@/data/module_1.json";
import module2 from "@/data/module_2.json";
import module3 from "@/data/module_3.json";
import module4 from "@/data/module_4.json";
import module5 from "@/data/module_5.json";
import module6 from "@/data/module_6.json";

import type { CourseModule, FutureModule } from "./types";

// TypeScript infiere `string` y `number` para los literales del JSON; la conversión
// los ajusta a las uniones de `CourseModule` (card_type, difficulty, scenario_id…).
export const MODULES: readonly CourseModule[] = [
  module1 as CourseModule,
  module2 as CourseModule,
  module3 as CourseModule,
  module4 as CourseModule,
  module5 as CourseModule,
  module6 as CourseModule,
];

export const FUTURE_MODULES: readonly FutureModule[] = [];

export function getModuleById(id: string | number): CourseModule | undefined {
  return MODULES.find((courseModule) => String(courseModule.module_id) === String(id));
}
