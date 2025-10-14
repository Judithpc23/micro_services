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
  robleProjectName?: string
  robleToken?: string
  createdAt: Date
}
