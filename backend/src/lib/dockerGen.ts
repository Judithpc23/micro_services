import fs from "fs/promises"; import path from "path";
export async function generateFiles({ svc, codigo, token }:{ svc:any; codigo:string; token?:string }){
const base = process.env.FILES_DIR || "./data/services";
const dir = path.join(base, svc.ownerId, svc.id);
if (svc.lenguaje === "Python") {
await fs.writeFile(path.join(dir,"main.py"), pyMain(codigo));
await fs.writeFile(path.join(dir,"Dockerfile"), pyDockerfile());
} else {
await fs.writeFile(path.join(dir,"main.js"), jsMain(codigo));
await fs.writeFile(path.join(dir,"Dockerfile"), jsDockerfile());
}
}
const jsMain = (userCode:string)=>[
"const http=require('http');const PORT=process.env.PORT||8080;",
"function userCode(body){ "+ userCode +" }",
"http.createServer((req,res)=>{let d='';req.on('data',c=>d+=c);",
"req.on('end',()=>{try{const out=userCode(d)||'OK';res.writeHead(200,{'Content-Type':'text/plain'});res.end(String(out));}",
"catch(e){res.writeHead(500,{'Content-Type':'text/plain'});res.end(String(e));}});}).listen(PORT,'0.0.0.0');"
].join("\n");


const jsDockerfile = ()=>[
"FROM node:20-slim",
"WORKDIR /app",
"RUN useradd -ms /bin/bash app && chown -R app:app /app",
"USER app",
"COPY main.js /app/main.js",
"ENV PORT=8080",
"EXPOSE 8080",
"CMD [\"node\",\"main.js\"]"
].join("\n");


const pyMain = (userCode:string)=>[
"from http.server import BaseHTTPRequestHandler, HTTPServer",
"import os",
"PORT=int(os.getenv(\"PORT\",\"8080\"))",
"def user_code(body:str):",
" "+ userCode.split("\n").join("\n "),
" return \"OK\"",
"class H(BaseHTTPRequestHandler):",
" def do_GET(self):",
" try: out=user_code(\"\"); self.send_response(200); self.end_headers(); self.wfile.write(out.encode())",
" except Exception as e: self.send_response(500); self.end_headers(); self.wfile.write(str(e).encode())",
" def do_POST(self):",
" length=int(self.headers.get('Content-Length',0)); body=self.rfile.read(length).decode() if length else \"\"",
" try: out=user_code(body); self.send_response(200); self.end_headers(); self.wfile.write(out.encode())",
" except Exception as e: self.send_response(500); self.end_headers(); self.wfile.write(str(e).encode())",
"HTTPServer((\"0.0.0.0\", PORT), H).serve_forever()"
].join("\n");


const pyDockerfile = ()=>[
"FROM python:3.11-slim",
"WORKDIR /app",
"RUN adduser --disabled-password --gecos \"\" app && chown -R app:app /app",
"USER app",
"COPY main.py /app/main.py",
"ENV PORT=8080",
"EXPOSE 8080",
"CMD [\"python\",\"main.py\"]"
].join("\n");