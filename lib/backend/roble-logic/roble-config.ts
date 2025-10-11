/**
 * Configuración centralizada para Roble
 * Maneja las variables de entorno de forma consistente
 */

export interface RobleConfig {
  baseUrl: string
  contract: string
}

/**
 * Obtener configuración de Roble desde variables de entorno
 */
export function getRobleConfig(): RobleConfig {
  const baseUrl = process.env.ROBLE_BASE_HOST || "https://roble-api.openlab.uninorte.edu.co"
  const contract = process.env.ROBLE_CONTRACT || "token_contract_xyz"
  
  if (!baseUrl || !contract) {
    throw new Error(
      'Configuración de Roble incompleta. ' +
      'Asegúrate de definir ROBLE_BASE_HOST y ROBLE_CONTRACT en tu .env'
    )
  }
  
  return { baseUrl, contract }
}

/**
 * Validar configuración de Roble
 */
export function validateRobleConfig(): boolean {
  try {
    getRobleConfig()
    return true
  } catch {
    return false
  }
}

/**
 * Obtener URL de autenticación
 */
export function getRobleAuthUrl(config: RobleConfig): string {
  return `${config.baseUrl}/auth/${config.contract}`
}

/**
 * Obtener URL de base de datos
 */
export function getRobleDatabaseUrl(config: RobleConfig): string {
  return `${config.baseUrl}/database/${config.contract}`
}
