export type Tipo = "ejecución" | "Roble";
export type Lenguaje = "Python" | "JS";
export type Status = "stopped" | "running" | "error";

export interface Microservicio {
  id: string;
  nombre: string;
  tipo: Tipo;
  lenguaje: Lenguaje;
  status: Status;
  // opcionales para UI
  endpoint?: string;
}
