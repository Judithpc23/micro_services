# Microservices Platform – Backend

Plataforma educativa para crear, almacenar y ejecutar microservicios dinámicos en tiempo de ejecución. Construida sobre Next.js (App Router) con endpoints REST bajo `/api/**`. Soporta dos tipos:

- `execution`: servicios que se ejecutan localmente (simulados o, a futuro, vía Docker real).
- `roble`: servicios ejecutados (o simulados) mediante la integración con la plataforma Roble.

## Arquitectura breve

- API Routes (Next.js):
	- `app/api/services/route.ts`: listado y creación
	- `app/api/services/[id]/route.ts`: lectura/actualización/eliminación
	- `app/api/services/[id]/dockerfile/route.ts`: genera Dockerfile y archivos base
	- `app/api/services/[id]/compose/route.ts`: genera docker-compose y scripts
	- `app/api/services/[id]/execute/route.ts`: ejecuta (inicia) un servicio
	- `app/api/services/[id]/start/route.ts`: inicia un servicio
	- `app/api/services/[id]/status/route.ts`: estado del servicio
	- `app/api/services/[id]/stop/route.ts`: detiene un servicio
	- `app/api/services/[id]/invoke/route.ts`: asegura que el servicio esté corriendo y devuelve endpoint (para pruebas rápidas)

- Capa backend (`lib/backend/**`):
	- `services-store.ts`: almacenamiento con persistencia en disco (`.data/services.json`)
	- `container-manager.ts`: gestiona el ciclo de vida (simulado local / Roble / placeholder Docker)
	- `roble-client.ts`: cliente Roble (modo stub por defecto + modo remoto habilitable por flag)
	- `code-validator.ts`: validación simple anti‑patrones peligrosos (eval, fs, subprocess, etc.)

- Generadores Docker (`lib/docker/**`):
	- `dockerfile-generator.ts`: genera Dockerfile y archivos de servicio
	- `docker-compose-generator.ts`: genera docker-compose y scripts start/stop

## Tipos

`Microservice` (`lib/types/microservice.ts`):
- id: string
- name: string
- description: string
- language: "python" | "javascript"
- code: string
- type: "execution" | "roble"
- tokenDatabase?: string  (requerido si `type === "roble"`)
- createdAt: Date

## Endpoints

- GET `/api/services`
	- Respuesta: `Microservice[]`

- POST `/api/services`
	- Body: { name, description, language: "python"|"javascript", code, type: "execution"|"roble", tokenDatabase? }
	- Si `type === "roble"`, `tokenDatabase` es obligatorio.
	- Respuesta: `Microservice` creado

- GET `/api/services/[id]`
	- Respuesta: `Microservice`

- PUT `/api/services/[id]`
	- Body parcial: { name?, description?, language?, code?, type?, tokenDatabase? }
	- Respuesta: `Microservice` actualizado

- DELETE `/api/services/[id]`
	- Respuesta: { success: true }

- GET `/api/services/[id]/dockerfile`
	- Respuesta: { success: true, data: { dockerfile, code, dependencies, language } }

- GET `/api/services/[id]/compose`
	- Respuesta: { dockerCompose, startScript, stopScript, port }

- POST `/api/services/[id]/execute`
	- Inicia el servicio. Para `type="execution"` arranca contenedor simulado local; para `type="roble"` delega en Roble.
	- Respuesta: { success, message, serviceId, status, endpoint, port, startedAt }

- POST `/api/services/[id]/start`
	- Igual a `execute` (alias de inicio). Respuesta similar.

- GET `/api/services/[id]/status`
	- Respuesta: { serviceId, serviceName, container: ContainerInfo }

- POST `/api/services/[id]/stop`
	- Detiene el servicio. Respuesta: { success, message, container }

- POST `/api/services/[id]/invoke`
  - Garantiza que el servicio esté en ejecución (lo inicia si no) y devuelve `{ endpoint, status }`.

`ContainerInfo`:
- serviceId: string
- status: "starting" | "running" | "stopped" | "error"
- endpoint: string | null
- port: number | null
- startedAt: string | null
- stoppedAt: string | null
- error: string | null

## Persistencia

El store mantiene los microservicios en memoria y los vuelca con debounce a `.data/services.json`. Al reiniciar en desarrollo se recargan los registros existentes. Esto evita depender de una base de datos externa en esta fase académica.

## Seguridad (Validación de Código)

`lib/backend/code-validator.ts` ejecuta un filtrado sencillo por expresiones regulares para impedir patrones considerados peligrosos (por ejemplo `eval(`, acceso a `fs` en Node, `subprocess` en Python). Si se detecta un patrón el endpoint POST/PUT devuelve HTTP 400 con el detalle.

Limitaciones: No es un análisis estático completo ni un sandbox. Para producción se recomienda usar aislamiento real (contenedores) y/o herramientas de análisis estático.

## Integración con Roble

- Archivo: `lib/backend/roble-client.ts`
- Métodos:
	- `runService(service, token)` -> { jobId, statusUrl, endpoint? }
	- `stopService(jobId, token)` -> void
	- `getStatus(jobId, token)` -> { jobId, state, endpoint?, error? }

Modos:
- Stub (por defecto): `ENABLE_ROBLE_REMOTE != true`. Se devuelven jobs sintéticos y endpoints locales.
- Remoto: `ENABLE_ROBLE_REMOTE=true`. Los métodos realizan peticiones HTTP reales (endpoints placeholder `/api/jobs` listos para ser ajustados a la API real de Roble).

Variables relevantes: `ROBLE_API_BASE`, `ROBLE_API_TIMEOUT`, `ROBLE_API_TOKEN`, `ROBLE_LOCAL_BASE_URL`.

Para conectar con la API oficial sustituya las rutas `/api/jobs` por las definitivas, añada headers requeridos y maneje campos de respuesta reales (estado, endpoint, errores).

`container-manager.ts` delega automáticamente hacia Roble cuando `service.type === "roble"`.

## Feature Flags y Variables de Entorno

Archivo de ejemplo: `.env.example`

| Variable | Descripción | Default |
|----------|-------------|---------|
| ENABLE_ROBLE_REMOTE | Activa modo remoto real Roble | false |
| ENABLE_DOCKER_RUNTIME | Activa ejecución real Docker (placeholder) | false |
| ROBLE_API_BASE | Base URL Roble | https://roble.openlab.uninorte.edu.co |
| ROBLE_API_TOKEN | Token global fallback | (vacío) |
| ROBLE_API_TIMEOUT | Timeout ms peticiones Roble | 10000 |
| ROBLE_LOCAL_BASE_URL | Base local para stubs | http://localhost:3000 |
| SERVICE_BASE_PORT | Puerto base asignación determinista | 45000 |

## Docker Runtime (Placeholder)

Cuando `ENABLE_DOCKER_RUNTIME=true`, el `container-manager` llamará a métodos `buildAndRunDocker` / `stopDockerContainer` que hoy son placeholders con logs. Allí se puede integrar `dockerode` o invocaciones CLI:

Pasos sugeridos:
1. Generar Dockerfile con `/api/services/[id]/dockerfile`.
2. Construir imagen (tag basada en id).
3. Correr contenedor mapeando puerto (hash determinista desde SERVICE_BASE_PORT).
4. Capturar logs y actualizar estado.
5. Al detener, hacer `docker stop` y opcional `docker rm`.

## Endpoint de Invocación Rápida

`POST /api/services/[id]/invoke` facilita el uso desde la UI: asegura que el servicio está corriendo y devuelve el endpoint sin duplicar lógica de arranque. La UI abre un diálogo para pegar parámetros / token.

`lib/backend/container-manager.ts` ya delega a Roble cuando `service.type === "roble"` y existe `tokenDatabase`.

## Cómo ejecutar

Requisitos: Node.js 18+.

Instalar dependencias y ejecutar en desarrollo (PowerShell):

```powershell
pnpm install
pnpm dev
```

o con npm:

```powershell
npm install
npm run dev
```

La API estará disponible en `http://localhost:3000/api/*`.

Build de producción:

```powershell
pnpm build; pnpm start
```

## Notas

- Persistencia ligera: `.data/services.json` (no hay migraciones; formato simple JSON).
- Scripts `start.sh` y `stop.sh` generados por `/compose` son demostrativos; en Windows use Docker Desktop / PowerShell adaptado.
- Validación de código es heurística: no ejecutar código no confiable sin aislamiento real.
- Extensiones futuras: métricas, logs por contenedor, colas de ejecución, sandboxing.

## Roadmap Breve

- [ ] Integrar endpoints reales Roble.
- [ ] Implementar Docker real (build/run/stop) con streaming de logs.
- [ ] Sandbox / aislamiento mejorado.
- [ ] Tests automatizados (unit + contract API).