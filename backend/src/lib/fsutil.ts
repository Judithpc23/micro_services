import fs from "fs/promises"; import path from "path";
export async function ensureFolders(ownerId:string, id:string){
const base = process.env.FILES_DIR || "./data/services";
const dir = path.join(base, ownerId, id);
await fs.mkdir(dir, { recursive:true });
return dir;
}