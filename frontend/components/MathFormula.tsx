"use client";

import katex from "katex";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

interface MathFormulaProps {
  formula: string;
  /** `true` para una fórmula centrada en bloque; `false` para una fórmula dentro del texto. */
  displayMode?: boolean;
  className?: string;
}

export function MathFormula({ formula, displayMode = false, className }: MathFormulaProps) {
  const html = useMemo(
    () => katex.renderToString(formula, { throwOnError: false, displayMode }),
    [formula, displayMode],
  );

  // El HTML lo genera KaTeX a partir de los JSON del repositorio, no de entrada del usuario.
  if (displayMode) {
    return (
      <div
        className={cn("overflow-x-auto overflow-y-hidden py-1", className)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
