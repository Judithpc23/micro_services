const assigned = new Map<string, number[]>();
export async function assign(ownerId:string){
const start = Number(process.env.HOST_EXPOSE_START || 6100);
const used = assigned.get(ownerId) || [];
const port = start + used.length;
assigned.set(ownerId, [...used, port]);
return port;
}