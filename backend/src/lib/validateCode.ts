const deny = [
/rm\s+-rf/i, /child_process/i, /exec\(/i, /spawn\(/i, /curl\s+http/i, /wget\s+http/i,
/nc\s+-e/i, /subprocess\.Popen.*shell\s*=\s*True/i, /\.\.\//
];
export function safeCodeOrThrow(code:string){
if (typeof code !== "string" || !code.trim()) throw new Error("Código vacío");
if (code.length > 10000) throw new Error("Código demasiado largo");
if (deny.some(rx => rx.test(code))) throw new Error("Código contiene patrones no permitidos");
}