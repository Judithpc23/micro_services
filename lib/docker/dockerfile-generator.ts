import type { Microservice } from "@/lib/types/microservice"

export function generateDockerfile(service: Microservice): string {
	const isPython = service.language === "python"
	const base = isPython
		? `FROM python:3.11-slim\n\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY main.py .\nEXPOSE 8000\nCMD ["python", "main.py"]\n`
		: `FROM node:18-alpine\n\nWORKDIR /app\nCOPY package.json .\nRUN npm install --production\nCOPY index.js .\nEXPOSE 3000\nCMD ["node", "index.js"]\n`

	const envLines: string[] = [
		`ENV SERVICE_NAME="${service.name}"`,
		`ENV SERVICE_TYPE="${service.type}"`,
	]
	if (service.type === "roble" && service.tokenDatabase) {
		envLines.push(`ENV ROBLE_TOKEN="${service.tokenDatabase}"`)
	}

	return `# Dockerfile for ${service.name}\n# Generated automatically\n\n${base}\n# Environment\n${envLines.join("\n")}\n`
}

export function generateServiceFiles(service: Microservice) {
	const dockerfile = generateDockerfile(service)
	if (service.language === "python") {
		return {
			dockerfile,
			code: service.code,
			dependencies: `# requirements.txt\nflask==3.0.0\nrequests==2.31.0\n`,
			language: service.language,
		}
	} else {
		return {
			dockerfile,
			code: service.code,
			dependencies: `{"name": "${service.name.toLowerCase().replace(/\s+/g, "-")}", "version":"1.0.0", "main":"index.js", "dependencies": {"express": "^4.18.2"}}`,
			language: service.language,
		}
	}
}
