// src/lib/runner.ts
import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { getRoble } from "./repo";

// Ruta del docker-compose por owner
function composePath(ownerId: string) {
  const base = process.env.FILES_DIR || "./data/services";
  return path.join(base, ownerId, "docker-compose.yml");
}

// Carpeta del servicio (donde están Dockerfile + main.js/py)
function serviceDir(ownerId: string, id: string) {
  const base = process.env.FILES_DIR || "./data/services";
  return path.join(base, ownerId, id);
}

export async function up({ svc }:{ svc:any }) {
  const composeFile = composePath(svc.ownerId);
  const rb = await getRoble(svc.id); // { dbName, accessToken, refreshToken? } | null
  await ensureComposeWithService(composeFile, svc, rb);

  // Docker Compose v2 (docker compose ...). Asegúrate de tener Docker Desktop levantado.
  await execP("docker", ["compose", "-f", composeFile, "up", "-d", svc.serviceName]);
}

export async function stop({ svc }:{ svc:any }) {
  const composeFile = composePath(svc.ownerId);
  await execP("docker", ["compose", "-f", composeFile, "rm", "-sf", svc.serviceName]);
}

async function ensureComposeWithService(
  composeFile: string,
  svc: any,
  rb: { dbName: string; accessToken: string } | null
) {
  // Normalizamos rutas en Windows a forward slashes para Compose
  const dir = serviceDir(svc.ownerId, svc.id).replace(/\\/g, "/");

  const envLines = [
    "      - PORT=8080",
    ...(svc.tipo === "Roble" && rb ? [
      `      - ROBLE_DB_NAME=${rb.dbName}`,
      `      - ROBLE_ACCESS_TOKEN=${rb.accessToken}`
    ] : []),
  ];

  // 1) Leemos compose existente (si no existe, empezamos con services:)
  let current = "";
  try { current = await fs.readFile(composeFile, "utf8"); } catch {}

  if (!current.trim()) current = "services:\n";

  // 2) Eliminamos bloque previo del mismo servicio (si existía)
  //    patrón sencillo: desde la línea del nombre hasta la próxima que no esté indentada a 2 espacios
  const blockRe = new RegExp(
    `(^|\\n)\\s{2}${escapeRegex(svc.serviceName)}:\\n([\\s\\S]*?)(?=\\n\\S|$)`,
    "g"
  );
  current = current.replace(blockRe, (_m, p1, _p2) => p1 || "");

  // 3) Construimos el bloque nuevo del servicio
  const block = [
    `  ${svc.serviceName}:`,
    `    build: ${dir}`,
    `    container_name: ${svc.serviceName}`,
    `    ports: ["${svc.port}:8080"]`,
    `    environment:`,
    ...envLines,
    `    restart: unless-stopped`,
    `    security_opt:`,
    `      - no-new-privileges:true`,
    ``,
  ].join("\n");

  // 4) Insertamos el bloque debajo de 'services:' (si no existe, lo agregamos al inicio)
  if (/^services:\s*$/m.test(current)) {
    current = current.replace(/^services:\s*$/m, `services:\n${block}`);
  } else if (/^services:\s*\n/m.test(current)) {
    current = current.replace(/^services:\s*\n/m, `services:\n${block}`);
  } else {
    current = `services:\n${block}\n${current}`;
  }

  // 5) Aseguramos la carpeta del compose y escribimos
  await fs.mkdir(path.dirname(composeFile), { recursive: true });
  await fs.writeFile(composeFile, current, "utf8");
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function execP(cmd: string, args: string[]) {
  return new Promise<void>((res, rej) =>
    execFile(cmd, args, { windowsHide: true }, (e) => (e ? rej(e) : res()))
  );
}
