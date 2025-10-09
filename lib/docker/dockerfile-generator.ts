import type { Microservice } from "@/lib/types/microservice"

/**
 * Genera el Dockerfile según el lenguaje del microservicio.
 * - Estándar de puerto por defecto: 3000 (ambos runtimes)
 * - Copia TODO el proyecto (usa .dockerignore)
 * - Expone ${PORT} y fija HOST=0.0.0.0
 */
export function generateDockerfile(service: Microservice): string {
	if (service.language === "python") {
		return generatePythonDockerfile(service)
	} else {
		return generateJavaScriptDockerfile(service)
	}
}

function generatePythonDockerfile(service: Microservice): string {
	const hasToken = service.type === "roble" && !!service.tokenDatabase

	return `# Dockerfile for ${service.name}
# Language: Python
# Type: ${service.type}

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \\
		PYTHONUNBUFFERED=1 \\
		HOST=0.0.0.0 \\
		PORT=3000 \\
		SERVICE_NAME="${service.name}" \\
		SERVICE_TYPE="${service.type}"
${hasToken ? `ENV ROBLE_TOKEN="${service.tokenDatabase}"` : "# No token required"}

WORKDIR /app

# Dependencias primero para cache estable
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copia TODO el código del servicio (endpoints, módulos, etc.)
COPY . /app

# Salud básica (opcional, Flask responde en /health o /)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \\
	CMD python -c "import sys,urllib.request as u; u.urlopen('http://127.0.0.1:'+__import__('os').environ.get('PORT','3000')+'/health'); sys.exit(0)" \\
	|| exit 1

EXPOSE ${"${PORT}"}

# Importante: tu main.py debe hacer app.run(host='0.0.0.0', port=int(os.getenv('PORT', '3000')))
CMD ["python", "main.py"]
`
}

function generateJavaScriptDockerfile(service: Microservice): string {
	const hasToken = service.type === "roble" && !!service.tokenDatabase

	return `# Dockerfile for ${service.name}
# Language: JavaScript (Node.js)
# Type: ${service.type}

FROM node:18-alpine

ENV NODE_ENV=production \\
		HOST=0.0.0.0 \\
		PORT=3000 \\
		SERVICE_NAME="${service.name}" \\
		SERVICE_TYPE="${service.type}"
${hasToken ? `ENV ROBLE_TOKEN="${service.tokenDatabase}"` : "# No token required"}

WORKDIR /app

# Instala dependencias con mejor cache
COPY package.json package-lock.json* /app/
RUN npm ci --only=production || npm install --production

# Copia TODO el código del servicio
COPY . /app

# Salud básica (Express responde en /health o /)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \\
	CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT||3000) +'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

EXPOSE ${"${PORT}"}

# Importante: tu index.js debe usar app.listen(process.env.PORT || 3000, '0.0.0.0')
CMD ["node", "index.js"]
`
}

/**
 * Genera los archivos del servicio (Dockerfile, código y dependencias).
 * - Requiere que el servicio ya tenga un entrypoint: main.py o index.js
 * - Requirements/package.json mínimos incluidos para levantar un HTTP básico.
 */
export function generateServiceFiles(service: Microservice): {
	dockerfile: string
	code: string
	dependencies: string
} {
	const dockerfile = generateDockerfile(service)

	if (service.language === "python") {
		return {
			dockerfile,
			code: service.code,
			// Flask + requests mínimos (puedes ampliarlo)
			dependencies: `# requirements.txt
flask==3.0.0
requests==2.31.0
`,
		}
	} else {
		// Node/Express con script start para buenas prácticas
		const pkgName = service.name.toLowerCase().replace(/\s+/g, "-")
		return {
			dockerfile,
			code: service.code,
			dependencies: `{
	"name": "${pkgName}",
	"version": "1.0.0",
	"type": "commonjs",
	"main": "index.js",
	"scripts": {
		"start": "node index.js"
	},
	"dependencies": {
		"express": "^4.18.2"
	}
}
`,
		}
	}
}
