import { NextResponse } from "next/server"
import { servicesStore } from "@/lib/backend/services-store"
import { robleClient } from "@/lib/backend/roble-client"
import { getRobleConfig, validateRobleConfig } from "@/lib/backend/roble-logic/roble-config"

// GET /api/debug/roble - Diagnóstico completo de Roble
export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {},
    configuration: {},
    authentication: {},
    database: {},
    sync: {},
    errors: []
  }

  try {
    // 1. Verificar variables de entorno
    console.log("🔍 Verificando variables de entorno...")
    diagnostics.environment = {
      SYNC_MICROSERVICES_TO_ROBLE: process.env.SYNC_MICROSERVICES_TO_ROBLE,
      ROBLE_BASE_HOST: process.env.ROBLE_BASE_HOST,
      ROBLE_CONTRACT: process.env.ROBLE_CONTRACT,
      ROBLE_USER_EMAIL: process.env.ROBLE_USER_EMAIL ? "Configurado" : "No configurado",
      ROBLE_USER_PASSWORD: process.env.ROBLE_USER_PASSWORD ? "Configurado" : "No configurado",
      ROBLE_USER_NAME: process.env.ROBLE_USER_NAME || "No configurado"
    }

    // 2. Verificar configuración de Roble
    console.log("🔧 Verificando configuración de Roble...")
    try {
      const config = getRobleConfig()
      diagnostics.configuration = {
        valid: true,
        baseUrl: config.baseUrl,
        contract: config.contract,
        authUrl: `${config.baseUrl}/auth/${config.contract}`,
        databaseUrl: `${config.baseUrl}/database/${config.contract}`
      }
    } catch (error) {
      diagnostics.configuration = {
        valid: false,
        error: error instanceof Error ? error.message : "Error desconocido"
      }
      diagnostics.errors.push("Configuración de Roble inválida")
    }

    // 3. Verificar autenticación
    console.log("🔐 Verificando autenticación...")
    try {
      const isAuthenticated = robleClient.isAuthenticated()
      diagnostics.authentication = {
        isAuthenticated,
        hasCredentials: !!(process.env.ROBLE_USER_EMAIL && process.env.ROBLE_USER_PASSWORD)
      }

      // Intentar autenticación si no está autenticado
      if (!isAuthenticated && process.env.ROBLE_USER_EMAIL && process.env.ROBLE_USER_PASSWORD) {
        console.log("🔄 Intentando autenticación...")
        const authResult = await robleClient.login(
          process.env.ROBLE_USER_EMAIL,
          process.env.ROBLE_USER_PASSWORD
        )
        diagnostics.authentication.authResult = authResult
        diagnostics.authentication.isAuthenticated = authResult.success
      }
    } catch (error) {
      diagnostics.authentication.error = error instanceof Error ? error.message : "Error desconocido"
      diagnostics.errors.push("Error en autenticación")
    }

    // 4. Verificar operaciones de base de datos
    console.log("🗄️ Verificando operaciones de base de datos...")
    try {
      if (diagnostics.authentication.isAuthenticated) {
        // Intentar leer la tabla microservices
        const readResult = await robleClient.readRecords('microservices', { limit: 1 })
        diagnostics.database = {
          canRead: readResult.success,
          readResult: readResult.success ? "Tabla accesible" : readResult.error
        }
      } else {
        diagnostics.database = {
          canRead: false,
          error: "No autenticado"
        }
      }
    } catch (error) {
      diagnostics.database.error = error instanceof Error ? error.message : "Error desconocido"
      diagnostics.errors.push("Error en operaciones de base de datos")
    }

    // 5. Verificar estado de sincronización
    console.log("🔄 Verificando estado de sincronización...")
    try {
      const syncStatus = servicesStore.getSyncStatus()
      diagnostics.sync = {
        enabled: syncStatus.enabled,
        robleConnected: syncStatus.robleConnected,
        syncEnabled: process.env.SYNC_MICROSERVICES_TO_ROBLE === "true"
      }
    } catch (error) {
      diagnostics.sync.error = error instanceof Error ? error.message : "Error desconocido"
      diagnostics.errors.push("Error verificando sincronización")
    }

    // 6. Resumen del diagnóstico
    const isHealthy = diagnostics.errors.length === 0 && 
                     diagnostics.configuration.valid && 
                     diagnostics.authentication.isAuthenticated &&
                     diagnostics.sync.enabled

    return NextResponse.json({
      success: true,
      healthy: isHealthy,
      diagnostics,
      summary: {
        totalChecks: 5,
        passedChecks: 5 - diagnostics.errors.length,
        failedChecks: diagnostics.errors.length,
        status: isHealthy ? "✅ Roble está configurado correctamente" : "❌ Hay problemas con la configuración de Roble"
      }
    })

  } catch (error) {
    console.error("❌ Error en diagnóstico de Roble:", error)
    return NextResponse.json({
      success: false,
      error: "Error ejecutando diagnóstico",
      details: error instanceof Error ? error.message : "Error desconocido",
      diagnostics
    }, { status: 500 })
  }
}

// POST /api/debug/roble - Probar sincronización con un microservicio de prueba
export async function POST() {
  try {
    console.log("🧪 Iniciando prueba de sincronización...")
    
    // Crear un microservicio de prueba
    const testService = {
      id: `test-${Date.now()}`,
      name: "Test Service",
      description: "Servicio de prueba para diagnóstico",
      language: "python" as const,
      code: "def test():\n    return 'Hello from test service'",
      type: "execution" as const,
      createdAt: new Date()
    }

    console.log("📝 Creando microservicio de prueba...")
    const createdService = servicesStore.create(testService)
    
    // Esperar un poco para que se ejecute la sincronización
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Verificar si se sincronizó
    console.log("🔍 Verificando sincronización...")
    const syncResult = await servicesStore.syncAllToRoble()
    
    return NextResponse.json({
      success: true,
      message: "Prueba de sincronización completada",
      testService: {
        id: createdService.id,
        name: createdService.name
      },
      syncResult,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("❌ Error en prueba de sincronización:", error)
    return NextResponse.json({
      success: false,
      error: "Error en prueba de sincronización",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
}
