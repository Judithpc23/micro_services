export function Header({ onNew }: { onNew: () => void }) {
  return (
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid #eee"}}>
      <h1 style={{margin:0,fontSize:20}}>Plataforma de Microservicios</h1>
      <button onClick={onNew}>＋ Nuevo</button>
    </header>
  );
}
