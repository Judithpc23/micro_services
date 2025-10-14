import { NextResponse } from "next/server"
import { containerManager } from "@/lib/backend/container-manager"

// POST /api/services/cleanup - Limpiar contenedores huérfanos
export async function POST() {
  try {
    console.log("🧹 Iniciando limpieza de contenedores huérfanos...")
    
    await containerManager.cleanupOrphanedContainers()
    
    return NextResponse.json({
      success: true,
      message: "Cleanup completed successfully"
    })
    
  } catch (error) {
    console.error("Cleanup error:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to cleanup containers",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
