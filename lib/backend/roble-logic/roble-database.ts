/**
 * Servicio de base de datos para Roble
 * Basado en la documentación oficial de Roble API
 */

import { RobleAuthService } from './roble-auth'

export interface RobleDatabaseConfig {
  baseUrl: string
  contract: string
  authService: RobleAuthService
}

export interface RobleQueryResult {
  success: boolean
  data?: any[]
  error?: string
  statusCode?: number
}

export interface RobleInsertResult {
  success: boolean
  inserted?: any[]
  skipped?: any[]
  error?: string
  statusCode?: number
}

export class RobleDatabaseService {
  private databaseUrl: string
  private authService: RobleAuthService
  
  constructor(config: RobleDatabaseConfig) {
    this.databaseUrl = `${config.baseUrl}/database/${config.contract}`.replace(/\/$/, '')
    this.authService = config.authService
  }
  
  /**
   * Realizar request con auto-refresh en 401
   */
  private async request(method: string, url: string, options: RequestInit = {}): Promise<Response> {
    const accessToken = this.authService.getAccessToken()
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })
    
    // Auto-refresh en 401
    if (response.status === 401) {
      console.log('401 detectado, intentando renovar token...')
      const refreshResult = await this.authService.refresh()
      
      if (refreshResult.success) {
        // Reintentar con nuevo token
        return fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${this.authService.getAccessToken()}`,
            'Content-Type': 'application/json',
            ...options.headers
          },
          ...options
        })
      }
    }
    
    return response
  }
  
  /**
   * Leer registros de una tabla
   */
  async readRecords(tableName: string, filters: Record<string, any> = {}): Promise<RobleQueryResult> {
    try {
      const url = `${this.databaseUrl}/read`
      
      // Filtrar parámetros que no son columnas de la tabla
      const { limit, offset, ...columnFilters } = filters
      const params = new URLSearchParams({ tableName, ...columnFilters })
      
      // Agregar limit y offset como parámetros de consulta separados si existen
      if (limit !== undefined) {
        params.append('limit', limit.toString())
      }
      if (offset !== undefined) {
        params.append('offset', offset.toString())
      }
      
      const response = await this.request('GET', `${url}?${params}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Request error ${response.status}: ${errorText}`,
          statusCode: response.status
        }
      }
      
      const data = await response.json()
      return { success: true, data }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
  
  /**
   * Insertar registros en una tabla
   */
  async insertRecords(tableName: string, records: any[]): Promise<RobleInsertResult> {
    try {
      const url = `${this.databaseUrl}/insert`
      
      const response = await this.request('POST', url, {
        body: JSON.stringify({ tableName, records })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Insert error ${response.status}: ${errorText}`,
          statusCode: response.status
        }
      }
      
      const data = await response.json()
      return { 
        success: true, 
        inserted: data.inserted,
        skipped: data.skipped
      }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
  
  /**
   * Actualizar un registro
   */
  async updateRecord(tableName: string, id: string, updates: Record<string, any>): Promise<RobleQueryResult> {
    try {
      const url = `${this.databaseUrl}/update`
      
      const response = await this.request('PUT', url, {
        body: JSON.stringify({
          tableName,
          idColumn: '_id',
          idValue: id,
          updates
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Update error ${response.status}: ${errorText}`,
          statusCode: response.status
        }
      }
      
      const data = await response.json()
      return { success: true, data }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
  
  /**
   * Eliminar un registro
   */
  async deleteRecord(tableName: string, id: string): Promise<RobleQueryResult> {
    try {
      const url = `${this.databaseUrl}/delete`
      
      const response = await this.request('DELETE', url, {
        body: JSON.stringify({
          tableName,
          idColumn: '_id',
          idValue: id
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Delete error ${response.status}: ${errorText}`,
          statusCode: response.status
        }
      }
      
      const data = await response.json()
      return { success: true, data }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
  
  /**
   * Crear una nueva tabla
   */
  async createTable(tableName: string, columns: any[]): Promise<RobleQueryResult> {
    try {
      const url = `${this.databaseUrl}/create-table`
      
      const response = await this.request('POST', url, {
        body: JSON.stringify({
          tableName,
          columns
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Create table error ${response.status}: ${errorText}`,
          statusCode: response.status
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
   * Obtener datos de una tabla
   */
  async getTableData(tableName: string, schema: string = 'public'): Promise<RobleQueryResult> {
    try {
      const url = `${this.databaseUrl}/table-data`
      const params = new URLSearchParams({ 
        schema, 
        table: tableName 
      })
      
      const response = await this.request('GET', `${url}?${params}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Get table data error ${response.status}: ${errorText}`,
          statusCode: response.status
        }
      }
      
      const data = await response.json()
      return { success: true, data }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}
