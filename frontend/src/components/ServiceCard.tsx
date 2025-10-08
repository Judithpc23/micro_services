import type { Microservicio } from "../types";

export function ServiceCard({
  svc, onEdit, onRun, onStop, onDelete
}:{ svc: Microservicio;
   onEdit: () => void; onRun: () => void; onStop: () => void; onDelete: (id: string) => void; }) {
  return (
    <div style={{border:"1px solid #eee",padding:12,borderRadius:8}}>
      <h3 style={{marginTop:0}}>{svc.nombre}</h3>
      <p style={{margin:"4px 0"}}>{svc.tipo} · {svc.lenguaje}</p>
      <p style={{margin:"4px 0"}}>Estado: <b>{svc.status}</b></p>
      {svc.endpoint && <p style={{margin:"4px 0"}}>Endpoint: <code>{svc.endpoint}</code></p>}
      <div style={{display:"flex",gap:8,marginTop:8}}>
        <button onClick={onEdit}>Editar</button>
        {svc.status!=="running"
          ? <button onClick={onRun}>Ejecutar</button>
          : <button onClick={onStop}>Detener</button>}
        <button onClick={() => onDelete(svc.id)}>Eliminar</button>
      </div>
    </div>
  );
}
