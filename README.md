# Finanzas corporativas: plataforma educativa y simulador CFO

Proyecto académico para la **Tecnicatura en Gestión y Análisis de Datos de la UBA**. La aplicación combina contenidos de finanzas corporativas con decisiones simuladas de inversión y financiamiento.

## Metodología

El recorrido comprende tres módulos, cada uno organizado en tres fases:

1. **Teoría:** conceptos, fórmulas y ejemplos desarrollados.
2. **Práctica:** tarjetas de repaso y cuestionarios interactivos.
3. **Caso CFO:** simulación de una empresa durante tres trimestres.

El **Simulador Integrador Final: Cashflow Corporativo** reúne los conceptos en una partida de hasta 12 trimestres. El objetivo es sostener la creación de valor, medida mediante EVA, sin perder solvencia. El modo docente/demo permite acceder libremente a los módulos y al simulador final.

La base bibliográfica incluye a **Brealey y Myers**, **Ross y Westerfield**, **Berk y DeMarzo**, **Aswath Damodaran** y **McKinsey**.

## Arquitectura

- **Frontend:** Next.js, TypeScript, KaTeX y Recharts. El progreso y las partidas se guardan en el `localStorage` del navegador; no hay base de datos.
- **Backend:** FastAPI y un motor financiero determinista en Python. Calcula estados contables, flujo de caja libre, VAN, TIR, WACC, ROIC y EVA, y valida el balance.
- **IA:** Gemini recibe un resumen de cifras y variaciones ya calculadas por Python y redacta un diagnóstico ejecutivo estructurado. La IA no realiza los cálculos financieros. Si falta la clave o falla la llamada, el sistema utiliza un diagnóstico determinista de respaldo.
- **Despliegue:** Vercel Services enruta `/api/*` al backend y las demás rutas al frontend. Los endpoints del backend conservan el prefijo `/api`.

Las cifras financieras se expresan en miles de USD (`$k`); los flujos son trimestrales y el WACC, el ROIC y el EVA se presentan anualizados.

## Ejecución local

Requisitos: Python 3.12 y Node.js con npm. Desde la raíz del repositorio:

1. Crear el entorno virtual e instalar las dependencias de desarrollo:

   ```powershell
   cd backend
   py -3.12 -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
   Copy-Item .env.example .env
   ```

   Edita `backend/.env` si deseas habilitar Gemini:

   - `GEMINI_API_KEY`: clave de Gemini; si está vacía, se usa el respaldo determinista.
   - `GEMINI_MODEL`: modelo a utilizar; por defecto, `gemini-3.5-flash-lite`.

   No incluyas claves reales en el repositorio. La disponibilidad del modelo depende de la cuenta y de la API.

2. Iniciar el backend desde `backend/`:

   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
   ```

3. En otra terminal, iniciar el frontend:

   ```powershell
   cd frontend
   npm ci
   npm run dev
   ```

   Abre la dirección indicada por Next.js, normalmente `http://localhost:3000`. En desarrollo, las solicitudes `/api/*` se redirigen al backend en `127.0.0.1:8000`. La documentación interactiva de la API está disponible en `/api/docs`.

## Verificación

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

```powershell
cd frontend
npm test
npm run lint
npm run build
```

## Vercel

Importa el repositorio como proyecto con la raíz en el directorio principal; `vercel.json` define ambos servicios y sus rutas. Configura `GEMINI_API_KEY` y, opcionalmente, `GEMINI_MODEL` como variables de entorno del proyecto. Sin clave, la API continúa funcionando con el evaluador de respaldo. Vercel Services está en fase beta; comprueba el despliegue y el límite de duración de las funciones del proyecto antes de utilizar Gemini en producción.

La especificación funcional y financiera se encuentra en [PROJECT_SPEC.md](PROJECT_SPEC.md).
