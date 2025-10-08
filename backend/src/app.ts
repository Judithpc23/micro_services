// src/app.ts
import "dotenv/config";
import express from "express";
import cors from "cors";

import services from "./routes/services";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

// Middlewares base
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Healthcheck
app.get("/health", (_req, res) => res.json({ ok: true }));

// Rutas de la API
app.use("/api/services", services);

// 404 para rutas no encontradas (opcional)
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// Manejador de errores central
app.use(errorHandler);

// Arranque del servidor
const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`API listening on :${port}`);
});
