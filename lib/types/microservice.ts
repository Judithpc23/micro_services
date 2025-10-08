export interface Microservice {
  id: string
  name: string
  description: string
  language: "python" | "javascript"
  code: string
  type: "execution" | "roble"
  tokenDatabase?: string
  createdAt: Date
}
