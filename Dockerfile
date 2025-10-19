# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++ git
COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit --legacy-peer-deps

# ---------- build ----------
FROM node:20-alpine AS builder
WORKDIR /app
# 1) Necesitamos package.json aquí para que "npm run build" exista
COPY package.json package-lock.json ./
# 2) Reutilizamos node_modules del stage deps
COPY --from=deps /app/node_modules ./node_modules

# 3) Copiamos fuentes necesarias para el build
COPY next.config.mjs tsconfig.json postcss.config.mjs components.json ./
COPY app ./app
COPY components ./components
COPY lib ./lib

# Si tienes estáticos, cópialos; si no, al menos crea la carpeta
RUN mkdir -p public
# COPY public ./public

# Si tu build lee .data, cópiala (si no, omite)
COPY .data ./.data
COPY hooks ./hooks

# (Opcional para diagnosticar TS/ESLint)
# ENV NEXT_DISABLE_ESLINT_PLUGIN=1 NEXT_SKIP_TYPECHECK=1 TSC_COMPILE_ON_ERROR=1

# 4) Build
RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat docker-cli docker-cli-compose
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
# Artefactos para next start
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=deps    /app/node_modules ./node_modules
COPY --from=builder /app/.data ./.data

RUN mkdir -p /app/services /app/.data && chown -R node:node /app

USER node
EXPOSE 3000
CMD ["npm","run","start"]  
