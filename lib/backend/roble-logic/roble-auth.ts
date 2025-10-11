/**
 * Servicio de autenticación para Roble
 * Basado en la documentación oficial de Roble API
 */

export interface RobleAuthConfig {
  baseUrl: string
  contract: string
}

export interface RobleAuthResult {
  success: boolean
  accessToken?: string
  refreshToken?: string
  error?: string
}

export class RobleAuthService {
  private authUrl: string
  private accessToken?: string
  private refreshToken?: string
  
  constructor(config: RobleAuthConfig) {
    this.authUrl = `${config.baseUrl}/auth/${config.contract}`.replace(/\/$/, '')
  }
  
  /**
   * Iniciar sesión en Roble
   */
  async login(email: string, password: string): Promise<RobleAuthResult> {
    try {
      const url = `${this.authUrl}/login`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Login error ${response.status}: ${errorText}`
        }
      }
      
      const data = await response.json()
      this.accessToken = data.accessToken
      this.refreshToken = data.refreshToken
      
      return {
        success: true,
        accessToken: this.accessToken,
        refreshToken: this.refreshToken
      }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
  
  /**
   * Registrar nuevo usuario
   */
  async signup(email: string, password: string, name: string): Promise<RobleAuthResult> {
    try {
      const url = `${this.authUrl}/signup-direct`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Signup error ${response.status}: ${errorText}`
        }
      }
      
      return { success: true }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
  
  /**
   * Renovar token de acceso
   */
  async refresh(): Promise<RobleAuthResult> {
    if (!this.refreshToken) {
      return {
        success: false,
        error: 'No hay refresh token para renovar'
      }
    }
    
    try {
      const url = `${this.authUrl}/refresh-token`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Refresh error ${response.status}: ${errorText}`
        }
      }
      
      const data = await response.json()
      this.accessToken = data.accessToken
      
      return {
        success: true,
        accessToken: this.accessToken
      }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
  
  /**
   * Cerrar sesión
   */
  async logout(): Promise<boolean> {
    try {
      const url = `${this.authUrl}/logout`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      this.accessToken = undefined
      this.refreshToken = undefined
      
      return response.ok
      
    } catch (error) {
      return false
    }
  }
  
  /**
   * Verificar si el token es válido
   */
  async verifyToken(): Promise<boolean> {
    if (!this.accessToken) {
      return false
    }
    
    try {
      const url = `${this.authUrl}/verify-token`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      return response.ok
      
    } catch (error) {
      return false
    }
  }
  
  /**
   * Obtener token de acceso actual
   */
  getAccessToken(): string | undefined {
    return this.accessToken
  }
  
  /**
   * Obtener refresh token actual
   */
  getRefreshToken(): string | undefined {
    return this.refreshToken
  }
  
  /**
   * Verificar si hay sesión activa
   */
  isAuthenticated(): boolean {
    return !!this.accessToken
  }
}
