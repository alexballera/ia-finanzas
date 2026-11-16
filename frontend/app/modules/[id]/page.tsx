import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ModuleView } from "@/components/ModuleView";
import { MODULES, getModuleById } from "@/lib/modules";

interface ModulePageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return MODULES.map((courseModule) => ({ id: String(courseModule.module_id) }));
}

export async function generateMetadata({ params }: ModulePageProps): Promise<Metadata> {
  const { id } = await params;
  const courseModule = getModuleById(id);
  return courseModule ? { title: `Módulo ${courseModule.module_id}: ${courseModule.title}` } : {};
}

async function ModuleContent({ params }: ModulePageProps) {
  const { id } = await params;
  const courseModule = getModuleById(id);
  if (!courseModule) {
    notFound();
  }
  return <ModuleView courseModule={courseModule} />;
}

export default function ModulePage({ params }: ModulePageProps) {
  // `params` se lee dentro de Suspense para que la navegación comparta un mismo App Shell.
  return (
    <Suspense
      fallback={
        <div aria-busy="true" className="space-y-4">
          <div className="h-32 animate-pulse rounded-2xl bg-slate-900" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-900" />
        </div>
      }
    >
      <ModuleContent params={params} />
    </Suspense>
  );
}
