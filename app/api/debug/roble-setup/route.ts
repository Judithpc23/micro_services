import { NextResponse } from "next/server"
import { robleClient } from "@/lib/backend/roble-client"

// POST /api/debug/roble-setup - Configurar y autenticar Roble
export async function POST() {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      steps: [],
      success: false,
      error: null
    }

    // Paso 1: Verificar variables de entorno
    results.steps.push("1. Verificando variables de entorno...")
    const email = process.env.ROBLE_USER_EMAIL
    const password = process.env.ROBLE_USER_PASSWORD
    const contract = process.env.ROBLE_CONTRACT
    const baseHost = process.env.ROBLE_BASE_HOST

    if (!email || !password || !contract || !baseHost) {
      results.error = "Variables de entorno faltantes"
      results.steps.push(`❌ Variables faltantes: ${!email ? 'ROBLE_USER_EMAIL ' : ''}${!password ? 'ROBLE_USER_PASSWORD ' : ''}${!contract ? 'ROBLE_CONTRACT ' : ''}${!baseHost ? 'ROBLE_BASE_HOST ' : ''}`)
      return NextResponse.json(results, { status: 400 })
    }

    results.steps.push("✅ Variables de entorno configuradas")

    // Paso 2: Intentar autenticación
    results.steps.push("2. Intentando autenticación con Roble...")
    try {
      const authResult = await robleClient.login(email, password)
      
      if (authResult.success) {
        results.steps.push("✅ Autenticación exitosa")
        results.success = true
      } else {
        results.error = `Error de autenticación: ${authResult.error}`
        results.steps.push(`❌ Error de autenticación: ${authResult.error}`)
        return NextResponse.json(results, { status: 401 })
      }
    } catch (error) {
      results.error = `Error conectando con Roble: ${error instanceof Error ? error.message : 'Unknown error'}`
      results.steps.push(`❌ Error de conexión: ${results.error}`)
      return NextResponse.json(results, { status: 500 })
    }

    // Paso 3: Verificar estado final
    results.steps.push("3. Verificando estado final...")
    const isAuthenticated = robleClient.isAuthenticated()
    const hasToken = !!robleClient.getAccessToken()
    
    if (isAuthenticated && hasToken) {
      results.steps.push("✅ RobleClient autenticado y listo")
      results.success = true
    } else {
      results.error = "RobleClient no se autenticó correctamente"
      results.steps.push("❌ RobleClient no autenticado")
      return NextResponse.json(results, { status: 500 })
    }

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({
      error: "Error en configuración",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
