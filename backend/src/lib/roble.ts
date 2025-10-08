const base = "https://roble-api.openlab.uninorte.edu.co";
const defTimeout = Number(process.env.ROBLE_TIMEOUT_MS || 5000);

function withTimeout<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("Timeout")), ms);
    p.then((v) => { clearTimeout(id); resolve(v); })
     .catch((e) => { clearTimeout(id); reject(e); });
  });
}

export async function login(dbName: string, email: string, password: string){
  const url = `${base}/auth/${dbName}/login`;
  const res = await withTimeout(fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  }), defTimeout);
  if(!res.ok) throw new Error(`ROBLE login failed (${res.status})`);
  return res.json() as Promise<{ accessToken: string; refreshToken: string }>;
}

export async function refresh(dbName: string, refreshToken: string){
  const url = `${base}/auth/${dbName}/refresh-token`;
  const res = await withTimeout(fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  }), defTimeout);
  if(!res.ok) throw new Error(`ROBLE refresh failed (${res.status})`);
  return res.json() as Promise<{ accessToken: string }>;
}

export async function verifyAccess(dbName: string, accessToken: string){
  const url = `${base}/auth/${dbName}/verify-token`;
  const res = await withTimeout(fetch(url, {
    method: "GET",
    headers: { "Authorization": `Bearer ${accessToken}` }
  }), defTimeout);
  return res.ok; // 200 => válido
}

// ======== Database helpers =========
async function req(dbName:string, path:string, method: string, body: any|undefined, accessToken: string){
  const url = `${base}/database/${dbName}${path}`;
  const res = await withTimeout(fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: body ? JSON.stringify(body) : undefined
  }), defTimeout);
  if(!res.ok){
    const txt = await res.text().catch(()=> "");
    throw new Error(`ROBLE ${method} ${path} failed (${res.status}) ${txt}`);
  }
  if(res.status === 204) return null;
  return res.json().catch(()=>null);
}

export const db = {
  createTable: (dbName:string, accessToken:string, payload:any)=> req(dbName, "/create-table", "POST", payload, accessToken),
  updateTable: (dbName:string, accessToken:string, tableName:string, payload:any)=> req(dbName, `/update-table/${tableName}`, "PUT", payload, accessToken),
  deleteTable: (dbName:string, accessToken:string, tableName:string)=> req(dbName, `/delete-table/${tableName}`, "DELETE", undefined, accessToken),
  tableData: (dbName:string, accessToken:string, params:{schema?:string; table:string})=> {
    const schema = params.schema || "public";
    return req(dbName, `/table-data?schema=${encodeURIComponent(schema)}&table=${encodeURIComponent(params.table)}`, "GET", undefined, accessToken);
  },
  addColumn: (dbName:string, accessToken:string, payload:any)=> req(dbName, "/add-column", "POST", payload, accessToken),
  updateColumn: (dbName:string, accessToken:string, tableName:string, payload:any)=> req(dbName, `/update-column/${tableName}`, "POST", payload, accessToken),
  dropColumn: (dbName:string, accessToken:string, payload:any)=> req(dbName, "/drop-column", "POST", payload, accessToken),
  insert: (dbName:string, accessToken:string, payload:any)=> req(dbName, "/insert", "POST", payload, accessToken),
  read: (dbName:string, accessToken:string, params:Record<string,string>)=> {
    const usp = new URLSearchParams({ ...params } as any);
    return req(dbName, `/read?${usp.toString()}`, "GET", undefined, accessToken);
  },
  update: (dbName:string, accessToken:string, payload:any)=> req(dbName, "/update", "PUT", payload, accessToken),
  delete: (dbName:string, accessToken:string, payload:any)=> req(dbName, "/delete", "DELETE", payload, accessToken),
};

export type RobleTokens = { accessToken: string; refreshToken?: string };