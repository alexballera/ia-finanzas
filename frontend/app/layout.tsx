import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

import { Navbar } from "@/components/Navbar";

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
        <Navbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </main>
        <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
          Finanzas Corporativas · Material educativo. Los cálculos del simulador son deterministas;
          la IA solo redacta el feedback.
        </footer>
      </body>
    </html>
  );
}
