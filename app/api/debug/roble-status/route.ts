import { NextResponse } from "next/server"
import { robleClient } from "@/lib/backend/roble-client"

// GET /api/debug/roble-status - Verificar estado del RobleClient
export async function GET() {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        ENABLE_ROBLE_REMOTE: process.env.ENABLE_ROBLE_REMOTE,
        ROBLE_BASE_HOST: process.env.ROBLE_BASE_HOST,
        ROBLE_CONTRACT: process.env.ROBLE_CONTRACT,
        ROBLE_USER_EMAIL: process.env.ROBLE_USER_EMAIL ? "Configurado" : "No configurado",
        ROBLE_USER_PASSWORD: process.env.ROBLE_USER_PASSWORD ? "Configurado" : "No configurado",
      },
      robleClient: {
        isAuthenticated: robleClient.isAuthenticated(),
        hasAccessToken: !!robleClient.getAccessToken(),
        remoteEnabled: process.env.ENABLE_ROBLE_REMOTE === "true"
      },
      recommendations: []
    }

    // Diagnósticos y recomendaciones
    if (process.env.ENABLE_ROBLE_REMOTE !== "true") {
      diagnostics.recommendations.push("Para usar Roble real, configurar ENABLE_ROBLE_REMOTE=true")
    }

    if (!process.env.ROBLE_USER_EMAIL || !process.env.ROBLE_USER_PASSWORD) {
      diagnostics.recommendations.push("Configurar ROBLE_USER_EMAIL y ROBLE_USER_PASSWORD para modo 'current'")
    }

    if (!robleClient.isAuthenticated()) {
      diagnostics.recommendations.push("RobleClient no está autenticado - verificar credenciales")
    }

    return NextResponse.json(diagnostics)
  } catch (error) {
    return NextResponse.json({
      error: "Error en diagnóstico",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
