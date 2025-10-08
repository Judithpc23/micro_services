import { randomUUID } from "crypto";


type Status = "stopped"|"running"|"error";
export type Svc = {
id:string; ownerId:string; nombre:string; tipo:"ejecución"|"Roble";
lenguaje:"Python"|"JS"; status:Status; port:number; serviceName:string;
createdAt:string; updatedAt:string;
};


const db:{ services:Svc[] } = { services:[] };


export async function create(input:{ownerId:string; nombre:string; tipo:any; lenguaje:any; port:number;}):Promise<Svc>{
const id = randomUUID();
const serviceName = `svc_${input.ownerId.slice(0,6)}_${id.slice(0,6)}`;
const now = new Date().toISOString();
const svc:Svc = { id, ownerId:input.ownerId, nombre:input.nombre, tipo:input.tipo, lenguaje:input.lenguaje,
status:"stopped", port:input.port, serviceName, createdAt:now, updatedAt:now };
db.services.push(svc);
return svc;
}
export async function listByOwner(ownerId:string){ return db.services.filter(s=>s.ownerId===ownerId); }
export async function getOwned(ownerId:string, id:string){
const svc = db.services.find(s=>s.id===id && s.ownerId===ownerId);
if(!svc) throw new Error("No encontrado"); return svc;
}
export async function updateStatus(id:string, status:Status){
const svc = db.services.find(s=>s.id===id); if(!svc) throw new Error("No encontrado");
svc.status = status; svc.updatedAt = new Date().toISOString();
}
export async function remove(id:string){ const i = db.services.findIndex(s=>s.id===id); if(i>=0) db.services.splice(i,1); }

// ======== Tokens ROBLE por servicio (en memoria) ========
const robleByService = new Map<string, { dbName: string; accessToken: string; refreshToken?: string }>();

export async function setRoble(serviceId: string, data: { dbName: string; accessToken: string; refreshToken?: string }) {
  robleByService.set(serviceId, data);
}
export async function getRoble(serviceId: string) {
  return robleByService.get(serviceId) || null;
}
export async function clearRoble(serviceId: string) {
  robleByService.delete(serviceId);
}