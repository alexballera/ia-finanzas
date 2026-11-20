"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import type { TutorContext } from "@/lib/types";

type ViewContext = Omit<TutorContext, "route">;
type RegisterContext = (context: TutorContext) => () => void;

const ActiveContext = createContext<TutorContext>({ route: "/" });
const ContextRegistry = createContext<RegisterContext | null>(null);

export function TutorContextProvider({ children }: { children: ReactNode }) {
  const route = usePathname();
  const [view, setView] = useState<TutorContext | null>(null);
  const register = useCallback<RegisterContext>((context) => {
    setView(context);
    return () => setView((current) => current === context ? null : current);
  }, []);

  const context = view?.route === route ? view : { route };

  return (
    <ContextRegistry.Provider value={register}>
      <ActiveContext.Provider value={context}>{children}</ActiveContext.Provider>
    </ContextRegistry.Provider>
  );
}

export function useTutorContext(): TutorContext {
  return useContext(ActiveContext);
}

/** Cada fase activa registra su contexto y lo retira al desmontarse. */
export function usePublishTutorContext(context: ViewContext | null) {
  const register = useContext(ContextRegistry);
  const route = usePathname();
  useEffect(() => {
    if (register && context) return register({ route, ...context });
  }, [register, route, context]);
}
