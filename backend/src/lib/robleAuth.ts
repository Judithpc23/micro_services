// src/lib/robleAuth.ts
import { cfg } from "../config/index";
import * as roble from "./roble";

let accessToken = cfg.robleApp.accessToken;
let refreshToken = cfg.robleApp.refreshToken;
const dbName = cfg.robleApp.dbName;

export function setTokens(tokens: { accessToken: string; refreshToken?: string }) {
  accessToken = tokens.accessToken;
  if (tokens.refreshToken) refreshToken = tokens.refreshToken;
}

export async function getAccessToken(): Promise<string> {
  if (!dbName) throw new Error("Falta ROBLE_APP_DB_NAME");
  if (!accessToken) throw new Error("Falta ROBLE_APP_ACCESS_TOKEN");

  // Verifica y refresca si hace falta
  const ok = await roble.verifyAccess(dbName, accessToken).catch(() => false);
  if (ok) return accessToken;

  if (refreshToken) {
    const res = await roble.refresh(dbName, refreshToken);
    accessToken = res.accessToken;
    return accessToken;
  }
  // si no hay refresh, devuelve el token aunque esté expirado (dejará error en la primera llamada)
  return accessToken;
}

export function getDbName() {
  if (!dbName) throw new Error("Falta ROBLE_APP_DB_NAME");
  return dbName;
}
