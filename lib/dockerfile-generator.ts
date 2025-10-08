import type { Microservice } from "@/app/page"

export function generateDockerfile(service: Microservice): string {
  if (service.language === "python") {
    return generatePythonDockerfile(service)
  } else {
    return generateJavaScriptDockerfile(service)
  }
}

function generatePythonDockerfile(service: Microservice): string {
  const hasToken = service.type === "roble" && service.token

  return `# Dockerfile for ${service.name}
# Language: Python
# Type: ${service.type}

FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy service code
COPY main.py .

# Set environment variables
${hasToken ? `ENV ROBLE_TOKEN="${service.token}"` : "# No token required"}
ENV SERVICE_NAME="${service.name}"
ENV SERVICE_TYPE="${service.type}"

# Expose port
EXPOSE 8000

# Run the service
CMD ["python", "main.py"]
`
}

function generateJavaScriptDockerfile(service: Microservice): string {
  const hasToken = service.type === "roble" && service.token

  return `# Dockerfile for ${service.name}
# Language: JavaScript (Node.js)
# Type: ${service.type}

FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json .
RUN npm install --production

# Copy service code
COPY index.js .

# Set environment variables
${hasToken ? `ENV ROBLE_TOKEN="${service.token}"` : "# No token required"}
ENV SERVICE_NAME="${service.name}"
ENV SERVICE_TYPE="${service.type}"

# Expose port
EXPOSE 3000

# Run the service
CMD ["node", "index.js"]
`
}

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
      dependencies: `# requirements.txt
flask==3.0.0
requests==2.31.0
`,
    }
  } else {
    return {
      dockerfile,
      code: service.code,
      dependencies: `{
  "name": "${service.name.toLowerCase().replace(/\s+/g, "-")}",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "express": "^4.18.2"
  }
}
`,
    }
  }
}
