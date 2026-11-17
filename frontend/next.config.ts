import type { NextConfig } from "next";

const LOCAL_BACKEND_URL = "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // El proxy de rewrites corta a los 30 s por defecto. El primer turno tras iniciar el backend
    // carga el SDK de Gemini y luego espera su respuesta (timeout de 15 s): necesita más margen.
    proxyTimeout: 90_000,
  },
  // En producción Vercel Services enruta /api/* al backend; el proxy solo aplica en desarrollo local.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${LOCAL_BACKEND_URL}/api/:path*`,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
