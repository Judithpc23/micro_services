import { Router } from "express";
import { safeCodeOrThrow } from "../lib/validateCode";
import * as repo from "../lib/repo";
import * as fsutil from "../lib/fsutil";
import * as ports from "../lib/ports";
import * as dockerGen from "../lib/dockerGen";
import * as runner from "../lib/runner";
import * as roble from "../lib/roble";
import { setRoble, getRoble, clearRoble } from "../lib/repo";

const r = Router();

// MVP: owner fijo para pruebas; reemplazar por auth JWT más adelante
r.use((req, _res, next) => {
  (req as any).user = { id: "demo-owner" };
  next();
});

// Crear microservicio
r.post("/", async (req, res, next) => {
  try {
    const { nombre, tipo, lenguaje, codigo, token, robleDbName, robleEmail, roblePassword, robleAccessToken, robleRefreshToken } = req.body || {};
    if (!nombre || !tipo || !lenguaje || !codigo) throw new Error("Datos incompletos");

    // validar código
    safeCodeOrThrow(codigo);

    // validar ROBLE si aplica
    let robleTokens: roble.RobleTokens | null = null;
    let robleDb = robleDbName as string | undefined;

    if (tipo === "Roble") {
      if (!robleDb) throw new Error("Falta robleDbName");

      if (robleEmail && roblePassword) {
        robleTokens = await roble.login(robleDb, robleEmail, roblePassword);
      } else if (robleAccessToken) {
        const ok = await roble.verifyAccess(robleDb, robleAccessToken);
        if (!ok) throw new Error("accessToken de ROBLE inválido");
        robleTokens = { accessToken: robleAccessToken, refreshToken: robleRefreshToken };
      } else {
        throw new Error("Falta credencial de ROBLE (email+password o accessToken)");
      }
    }

    const ownerId = (req as any).user.id;
    const port = await ports.assign(ownerId);
    const svc = await repo.create({ ownerId, nombre, tipo, lenguaje, port });

    await fsutil.ensureFolders(ownerId, svc.id);
    await dockerGen.generateFiles({ svc, codigo, token });

    if (tipo === "Roble" && robleTokens && robleDb) {
      await setRoble(svc.id, { dbName: robleDb, accessToken: robleTokens.accessToken, refreshToken: robleTokens.refreshToken });
    }

    res.status(201).json(svc);
  } catch (e) { next(e); }
});


// Listar microservicios del usuario
r.get("/", async (req, res, next) => {
  try {
    const list = await repo.listByOwner((req as any).user.id);
    res.json(list);
  } catch (e) {
    next(e);
  }
});

// Obtener uno
r.get("/:id", async (req, res, next) => {
  try {
    const svc = await repo.getOwned((req as any).user.id, req.params.id);
    res.json(svc);
  } catch (e) {
    next(e);
  }
});

// Editar (no permitir cambiar lenguaje en MVP)
r.put("/:id", async (req, res, next) => {
  try {
    const { nombre, tipo, codigo, token } = req.body || {};
    const svc = await repo.getOwned((req as any).user.id, req.params.id);

    if (codigo) {
      safeCodeOrThrow(codigo);
    }

    // actualizar metadatos simples
    if (nombre) svc.nombre = nombre;
    if (tipo) svc.tipo = tipo;
    svc.updatedAt = new Date().toISOString();

    // re-generar archivos si hay nuevo código
    if (typeof codigo === "string") {
      await dockerGen.generateFiles({ svc, codigo, token });
    }

    res.json(svc);
  } catch (e) {
    next(e);
  }
});

// Ejecutar
r.post("/:id/run", async (req, res, next) => {
  try {
    const svc = await repo.getOwned((req as any).user.id, req.params.id);
    await runner.up({ svc });
    await repo.updateStatus(svc.id, "running");
    res.json({ endpoint: `http://localhost:${svc.port}/` });
  } catch (e) {
    next(e);
  }
});

// Detener
r.post("/:id/stop", async (req, res, next) => {
  try {
    const svc = await repo.getOwned((req as any).user.id, req.params.id);
    await runner.stop({ svc });
    await repo.updateStatus(svc.id, "stopped");
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Eliminar
r.delete("/:id", async (req, res, next) => {
  try {
    const svc = await repo.getOwned((req as any).user.id, req.params.id);
    if (svc.status === "running") {
      await runner.stop({ svc });
    }
    await repo.remove(svc.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default r;
