import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

import { Navbar } from "@/components/Navbar";
import { AITutorDrawer } from "@/components/AITutorDrawer";
import { TutorContextProvider } from "@/components/TutorContextProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Finanzas Corporativas · Simulador CFO",
    template: "%s · Simulador CFO",
  },
  description:
    "Plataforma educativa de Finanzas Corporativas: teoría, práctica y simulación de decisiones de un CFO.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <TutorContextProvider>
          <Navbar />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
            {children}
          </main>
          <footer className="border-t border-slate-800/80 px-4 pt-6 pb-16 text-center text-xs text-slate-500">
            <p>Finanzas Corporativas · Material educativo. Los cálculos del simulador son deterministas; la IA explica los resultados.</p>
            <p className="mt-2">Referencia académica: Tecnicatura Universitaria en Gestión y Análisis de Datos en las Organizaciones (UBA).</p>
            <p className="mt-2">Bibliografía base: Brealey, Myers &amp; Allen; Ross, Westerfield &amp; Jaffe; Berk &amp; DeMarzo; Damodaran; McKinsey (Valuation).</p>
          </footer>
          <AITutorDrawer />
        </TutorContextProvider>
      </body>
    </html>
  );
}
