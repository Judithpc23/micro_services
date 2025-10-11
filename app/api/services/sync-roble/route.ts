import { NextResponse } from "next/server"
import { servicesStore } from "@/lib/backend/services-store"

// POST /api/services/sync-roble - Sincronizar todos los microservicios con Roble
export async function POST() {
  try {
    const result = await servicesStore.syncAllToRoble()
    
    return NextResponse.json({
      success: true,
      message: `Synchronization completed: ${result.success} success, ${result.failed} failed`,
      results: result
    })
  } catch (error) {
    console.error("Error syncing to Roble:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to sync to Roble",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// GET /api/services/sync-roble - Verificar estado de sincronización
export async function GET() {
  try {
    const status = servicesStore.getSyncStatus()
    
    return NextResponse.json({
      success: true,
      status
    })
  } catch (error) {
    console.error("Error getting sync status:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to get sync status",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
