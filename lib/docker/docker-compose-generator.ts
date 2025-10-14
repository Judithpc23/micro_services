import type { Microservice } from "@/lib/types/microservice"

export function generateDockerCompose(service: Microservice, port: number): string {
		// Dockerfiles generated set PORT=3000 for both runtimes, so containers listen on 3000
		const internalPort = 3000
	const env: Record<string, string> = {
		SERVICE_NAME: service.name,
		SERVICE_TYPE: service.type,
	}
	if (service.type === "roble" && service.tableName) env["TABLE_NAME"] = service.tableName
	if (service.type === "roble" && service.robleProjectName) env["ROBLE_PROJECT"] = service.robleProjectName
	if (service.type === "roble" && service.robleToken) env["ROBLE_TOKEN"] = service.robleToken

	const compose = {
		services: {
			[service.id]: {
				container_name: `microservice-${service.id}`,
				build: { context: ".", dockerfile: `dockerfiles/Dockerfile.${service.id}` },
				ports: [`${port}:${internalPort}`],
				environment: env,
				restart: "unless-stopped",
				networks: ["microservices-network"],
			},
		},
		networks: { "microservices-network": { driver: "bridge" } },
	}
	return convertToYAML(compose)
}

export function generateStartScript(serviceId: string): string {
	return `#!/bin/bash\nset -e\n\nSTACK=docker-compose.${serviceId}.yml\necho "Starting ${serviceId}"\ndocker-compose -f $STACK up -d\n`}

export function generateStopScript(serviceId: string): string {
	return `#!/bin/bash\nset -e\n\nSTACK=docker-compose.${serviceId}.yml\necho "Stopping ${serviceId}"\ndocker-compose -f $STACK down\n`}

function convertToYAML(obj: any, indent = 0): string {
	const spaces = "  ".repeat(indent)
	let yaml = ""
	for (const [key, value] of Object.entries(obj)) {
		if (value === null || value === undefined) continue
		if (typeof value === "object" && !Array.isArray(value)) {
			yaml += `${spaces}${key}:\n${convertToYAML(value, indent + 1)}`
		} else if (Array.isArray(value)) {
			yaml += `${spaces}${key}:\n`
			value.forEach((item) => {
				if (typeof item === "object") {
					yaml += `${spaces}  -\n${convertToYAML(item, indent + 2)}`
				} else {
					yaml += `${spaces}  - ${item}\n`
				}
			})
		} else {
			yaml += `${spaces}${key}: ${value}\n`
		}
	}
	return yaml
}

export function generateGlobalDockerCompose(services: Microservice[]): string {
	const compose: { services: Record<string, any>; networks: any } = {
		services: {},
		networks: { "microservices-network": { driver: "bridge" } },
	}

	services.forEach(service => {
		const port = allocatePort(service.id)
		const env: Record<string, string> = {
			SERVICE_NAME: service.name,
			SERVICE_TYPE: service.type,
		}
		if (service.type === "roble" && service.tableName) {
			env["TABLE_NAME"] = service.tableName
		}
		if (service.type === "roble" && service.robleProjectName) {
			env["ROBLE_PROJECT"] = service.robleProjectName
		}
		if (service.type === "roble" && service.robleToken) {
			env["ROBLE_TOKEN"] = service.robleToken
		}

		compose.services[service.id] = {
			container_name: `microservice-${service.id}`,
			build: { context: `./services/service-${service.id}`, dockerfile: `../../dockerfiles/Dockerfile.${service.id}` },
			ports: [`${port}:3000`],
			environment: env,
			restart: "unless-stopped",
			networks: ["microservices-network"],
		}
	})

	return convertToYAML(compose)
}

function allocatePort(serviceId: string): number {
	const basePort = 45000
	let hash = 0
	for (let i = 0; i < serviceId.length; i++) {
		hash = (hash * 31 + serviceId.charCodeAt(i)) >>> 0
	}
	return basePort + (hash % 1000)
}