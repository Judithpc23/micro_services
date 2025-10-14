export interface Microservice {
  id: string
  name: string
  description: string
  language: "python" | "javascript"
  code: string
  type: "execution" | "roble"
  // New: table name for Roble-backed services
  tableName?: string
  // Roble specific fields
  robleContract?: string
  robleEmail?: string
  roblePassword?: string
  robleToken?: string
  robleMode?: "current" | "different"
  createdAt: Date
}
