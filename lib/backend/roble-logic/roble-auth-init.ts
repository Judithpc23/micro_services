/**
 * Inicialización automática de autenticación con Roble
 * Configura credenciales y realiza login inicial
 */

import { RobleAuthService } from './roble-auth'
import { getRobleConfig } from './roble-config'

export interface RobleAuthCredentials {
  email: string
  password: string
  name?: string
}

export class RobleAuthInitializer {
  private authService: RobleAuthService
  private credentials?: RobleAuthCredentials
  
  constructor() {
    const config = getRobleConfig()
    this.authService = new RobleAuthService(config)
  }
  
  /**
   * Configurar credenciales de autenticación
   */
  setCredentials(credentials: RobleAuthCredentials): void {
    this.credentials = credentials
  }
  
  /**
   * Realizar login inicial automático
   */
  async initializeAuth(): Promise<boolean> {
    if (!this.credentials) {
      console.warn('⚠️ No hay credenciales configuradas para Roble')
      return false
    }
    
    try {
      console.log('🔐 Iniciando autenticación con Roble...')
      
      const result = await this.authService.login(
        this.credentials.email,
        this.credentials.password
      )
      
      if (result.success) {
        console.log('✅ Autenticación exitosa con Roble')
        console.log('   - Access Token: Configurado')
        console.log('   - Refresh Token: Configurado')
        return true
      } else {
        console.error('❌ Error en autenticación:', result.error)
        return false
      }
      
    } catch (error) {
      console.error('❌ Error inicializando autenticación:', error)
      return false
    }
  }
  
  /**
   * Verificar si la autenticación está activa
   */
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated()
  }
  
  /**
   * Obtener el servicio de autenticación
   */
  getAuthService(): RobleAuthService {
    return this.authService
  }
  
  /**
   * Configurar credenciales desde variables de entorno
   */
  loadCredentialsFromEnv(): void {
    const email = process.env.ROBLE_USER_EMAIL
    const password = process.env.ROBLE_USER_PASSWORD
    const name = process.env.ROBLE_USER_NAME
    
    console.log('🔍 Verificando credenciales de entorno:')
    console.log('   - ROBLE_USER_EMAIL:', email ? 'Configurado' : 'No configurado')
    console.log('   - ROBLE_USER_PASSWORD:', password ? 'Configurado' : 'No configurado')
    console.log('   - ROBLE_USER_NAME:', name || 'No configurado')
    
    if (email && password) {
      this.setCredentials({ email, password, name })
      console.log('✅ Credenciales cargadas desde variables de entorno')
    } else {
      console.warn('⚠️ Variables ROBLE_USER_EMAIL y ROBLE_USER_PASSWORD no configuradas')
    }
  }
}

// Instancia global para uso en toda la aplicación
export const robleAuthInitializer = new RobleAuthInitializer()
