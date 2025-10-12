import { NextResponse } from "next/server"
import { robleClient } from "@/lib/backend/roble-client"

// GET /api/verify-roble-data - Verificar datos en Roble con autenticación fresca
export async function GET() {
  try {
    console.log("🔍 Verificando datos en Roble con autenticación fresca...")
    
    // Forzar nueva autenticación
    const email = process.env.ROBLE_USER_EMAIL
    const password = process.env.ROBLE_USER_PASSWORD
    
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: "Credenciales no configuradas"
      })
    }
    
    console.log("🔄 Forzando nueva autenticación...")
    const authResult = await robleClient.login(email, password)
    
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: "Error en autenticación",
        details: authResult.error
      })
    }
    
    console.log("✅ Autenticación exitosa, leyendo tabla...")
    
    // Leer todos los registros de la tabla microservices
    const readResult = await robleClient.readRecords('microservices')
    
    console.log("📊 Resultado de lectura:", readResult)
    
    if (readResult.success) {
      const records = readResult.data || []
      console.log(`📋 Encontrados ${records.length} registros en Roble`)
      
      return NextResponse.json({
        success: true,
        message: "Verificación completada",
        timestamp: new Date().toISOString(),
        recordCount: records.length,
        records: records.slice(0, 5), // Mostrar solo los primeros 5
        authResult: {
          success: authResult.success,
          hasAccessToken: !!authResult.accessToken,
          hasRefreshToken: !!authResult.refreshToken
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Error leyendo tabla",
        details: readResult.error
      })
    }
    
  } catch (error) {
    console.error("❌ Error en verificación:", error)
    return NextResponse.json({
      success: false,
      error: "Error en verificación",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
}
