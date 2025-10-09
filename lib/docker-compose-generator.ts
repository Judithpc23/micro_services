import type { Microservice } from "@/lib/types/microservice"

export interface DockerComposeConfig {
  version: string
  services: {
    [key: string]: {
      build?: {
        context: string
        dockerfile: string
      }
      image?: string
      container_name: string
      ports: string[]
      environment?: Record<string, string>
      volumes?: string[]
      restart: string
      networks?: string[]
    }
  }
  networks?: {
    [key: string]: {
      driver: string
    }
  }
}

export function generateDockerCompose(service: Microservice, port: number): string {
  const containerName = `microservice-${service.id}`
  const internalPort = service.language === "python" ? 8000 : 3000

  const config: DockerComposeConfig = {
    version: "3.8",
    services: {
      [service.id]: {
        container_name: containerName,
        build: {
          context: ".",
          dockerfile: `Dockerfile.${service.id}`,
        },
        ports: [`${port}:${internalPort}`],
        environment:
          service.type === "roble" && service.tokenDatabase
            ? {
                SERVICE_TOKEN: service.tokenDatabase,
                SERVICE_TYPE: "roble",
                SERVICE_NAME: service.name,
              }
            : {
                SERVICE_TYPE: "execution",
                SERVICE_NAME: service.name,
              },
        restart: "unless-stopped",
        networks: ["microservices-network"],
      },
    },
    networks: {
      "microservices-network": {
        driver: "bridge",
      },
    },
  }

  return `# Docker Compose configuration for ${service.name}
# Generated automatically - Do not edit manually

${convertToYAML(config)}`
}

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

export function generateStartScript(serviceId: string): string {
  return `#!/bin/bash
# Start script for microservice ${serviceId}

echo "Starting microservice ${serviceId}..."
docker-compose -f docker-compose.${serviceId}.yml up -d

echo "Microservice started successfully!"
echo "Check status with: docker-compose -f docker-compose.${serviceId}.yml ps"
`
}

export function generateStopScript(serviceId: string): string {
  return `#!/bin/bash
# Stop script for microservice ${serviceId}

echo "Stopping microservice ${serviceId}..."
docker-compose -f docker-compose.${serviceId}.yml down

echo "Microservice stopped successfully!"
`
}
