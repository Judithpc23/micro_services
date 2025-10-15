#  Microservices Platform

## Tabla de Contenidos

- [Descripción del Proyecto](#-descripción-del-proyecto)
- [Características](#-características-detalladas)
- [Stack Tecnológico](#-stack-tecnológico)
- [Quick Start](#-quick-start)
- [Instalación Detallada](#-instalación-detallada)
- [Configuración](#-configuración)
- [Guía de Uso](#-guía-de-uso)
- [API Principal](#-api-principal)
- [Ejemplos de Solicitudes y Respuestas](#-ejemplos-de-solicitudes-y-respuestas)
- [Tipos de Servicios](#-tipos-de-servicios)
- [Arquitectura](#-arquitectura)
- [Scripts](#-scripts)
- [Construcción y Ejecución de Contenedores](#-construcción-y-ejecución-de-contenedores)
- [Troubleshooting](#-troubleshooting)
- [Licencia](#-licencia)

---

##  Descripción del Proyecto

**Microservices Platform** es una plataforma completa y moderna para crear, gestionar y desplegar microservicios de forma sencilla y eficiente. La plataforma permite a los desarrolladores crear microservicios en **Python** o **JavaScript**, gestionarlos a través de un dashboard intuitivo y desplegarlos automáticamente en contenedores Docker.

###  Objetivo Principal

Simplificar el proceso de creación y gestión de microservicios, permitiendo a los desarrolladores:
- Crear microservicios sin configuración manual de Docker
- Gestionar múltiples servicios desde un dashboard centralizado
- Desplegar y escalar servicios de forma automática
- Monitorear el estado de los servicios en tiempo real

## Características

### Características Clave

- **100% Basado en Contenedores Docker**: Cada microservicio se ejecuta en su propio contenedor aislado
- **Multi-lenguaje**: Soporte para Python y JavaScript
- **Auto-despliegue**: Generación automática de Dockerfiles y despliegue instantáneo
- **Dashboard Web**: Interfaz intuitiva para gestionar todos los servicios
- **Integración Roble**: Soporte para servicios con acceso a bases de datos
- **Operaciones Bulk**: Gestiona múltiples servicios simultáneamente
- **Health Checks**: Monitoreo automático del estado de los servicios
- **Auto-restart**: Reinicio automático de contenedores en caso de fallo

### Funcionalidades Técnicas

- Crear y gestionar microservicios (Python/JavaScript)
- Generación automática de Dockerfiles
- Control completo de contenedores Docker
- Dashboard intuitivo con UI moderna
- Operaciones bulk (iniciar/detener todos)
- Integración con Roble para bases de datos
- Validación de código y seguridad
- Auto-restart de contenedores
- Health checks integrados

## Stack Tecnológico

**Frontend:** Next.js 15, TypeScript, Tailwind CSS, Radix UI  
**Backend:** Next.js API Routes, Dockerode  
**DevOps:** Docker, Docker Compose

##  Quick Start

### Instalación en 3 Pasos

```bash
# 1. Clonar e instalar
git clone <tu-repositorio>
cd micro_services
npm install

# 2. Configurar y crear red Docker
cp .env.example .env.local  # Editar con tus credenciales
docker network create microservices_net

# 3. Ejecutar
npm run dev
```

Abre `http://localhost:3000` y ¡listo! 

### Crear tu Primer Microservicio

1. Ve al dashboard en `http://localhost:3000`
2. Completa el formulario:
   - **Nombre**: "Mi Primer Servicio"
   - **Lenguaje**: Python o JavaScript
   - **Código**: Tu código personalizado
3. Haz clic en "Create Service"
4. ¡El contenedor se construye y ejecuta automáticamente!

##  Instalación Detallada

### Requisitos Previos

- **Node.js** >= 18.x
- **Docker** >= 20.x (obligatorio)
- **Docker Compose** >= 2.x

### Verificar Requisitos

```bash
# Verificar versiones
node --version    # Debe ser >= 18.x
npm --version     # Debe ser >= 9.x
docker --version  # Debe ser >= 20.x
docker-compose --version  # Debe ser >= 2.x
```

### Pasos de Instalación Completos

```bash
# 1. Clonar el repositorio
git clone <tu-repositorio>
cd micro_services

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
# Crea un archivo .env.local en la raíz del proyecto
# Copia el contenido de la sección "Configuración" más abajo

# 4. Crear red Docker (obligatorio)
docker network create microservices_net

# 5. Verificar que Docker está corriendo
docker ps

# 6. Ejecutar la aplicación
npm run dev
```

Abre `http://localhost:3000` en tu navegador

### Verificación de Docker

```bash
# Verificar que Docker está corriendo
docker ps

# Verificar que la red existe
docker network ls | grep microservices_net

# Si Docker no está corriendo (Linux)
sudo systemctl start docker

# Si Docker no está corriendo (macOS/Windows)
# Abre Docker Desktop
```

## Configuración

### Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Docker Configuration (Requerido)
ENABLE_DOCKER_RUNTIME=true
SERVICE_BASE_PORT=45000
DOCKER_NETWORK_NAME=microservices_net
PROXY_BASE_URL=http://localhost:3000

# Configuración de Roble (Opcional)
SYNC_MICROSERVICES_TO_ROBLE=false
ROBLE_BASE_HOST=https://roble-api.openlab.uninorte.edu.co
ROBLE_CONTRACT=micro_services_b5fd2708be
ENABLE_ROBLE_REMOTE=false
ROBLE_USER_EMAIL=test@example.com
ROBLE_USER_PASSWORD=Password123!
ROBLE_USER_NAME=Test User

# Configuración de logging
LOG_LEVEL=debug

# Development
NODE_ENV=development
```

**Nota:** Ajusta las credenciales de Roble según tu configuración.

##  Guía de Uso

### Crear un Microservicio

**Dashboard:**
1. Ve a `http://localhost:3000`
2. Completa el formulario (nombre, lenguaje, tipo, código)
3. Haz clic en "Create Service"

**API:**
```bash
curl -X POST http://localhost:3000/api/services \
  -H "Content-Type: application/json" \
  -d '{"name": "Calculator", "language": "python", "type": "execution", "code": "def add(a, b): return a + b"}'
```

### Gestionar Servicios

| Operación | Descripción |
|-----------|-------------|
| **Iniciar** | Construye y ejecuta el contenedor |
| **Detener** | Detiene el contenedor |
| **Estado** | Ver estado (running/stopped/error) |
| **Ejecutar** | Ejecuta el código |
| **Editar** | Modificar y reiniciar |
| **Eliminar** | Eliminar servicio |

**Bulk:** Iniciar/detener todos, sincronizar con Docker

### Ejemplos de Código

#### Servicios Execution (Python)

**Ejemplo 1: Función Simple**
```python
def hola():
    return "Hola mundo"
```

**Ejemplo 2: Calculadora con Parámetros**
```python
# Endpoint está en http://localhost:3000/{id}/execute?a=1&b=2
def suma():
    a = request.args.get('a', default=0, type=int)
    b = request.args.get('b', default=0, type=int)
    resultado = a + b
    return f"La suma de {a} y {b} es {resultado}"
```

#### Servicios Execution (JavaScript)

**Ejemplo 1: Función Simple**
```javascript
function saludar() {
    return "Hola mundo desde JavaScript";
}
```

**Ejemplo 2: Procesador de Datos**
```javascript
function process_data(data) {
    return data.map(item => ({
        ...item,
        processed: true,
        value: item.value * 2
    }));
}
```

#### Servicios Roble (Solo Python)

**Ejemplo 1: Lectura de Datos**
```python
def main():
    records = read_data()
    print(f"Found {len(records)} records")
    
    for record in records:
        print(f"Record ID: {record.get('_id')}")
        print(f"Data: {record}")
    
    return {
        "message": "Roble microservice executed successfully",
        "records_count": len(records),
        "records": records,
        "status": "completed"
    }
```


# Funciones helper disponibles:
# - read_data(filters=None): Leer registros de la tabla
# - insert_data(records): Insertar nuevos registros
# - update_data(record_id, updates): Actualizar un registro específico
# - delete_data(record_id): Eliminar un registro específico
```

### Invocar Servicio

```bash
curl -X POST http://localhost:3000/api/services/{id}/invoke \
  -H "Content-Type: application/json" \
  -d '{"param": "value"}'
```

### Monitorear

```bash
docker logs -f microservice-{id}        # Ver logs
docker ps | grep microservice-{id}     # Ver estado
docker stats microservice-{id}         # Ver recursos
```

##  API Principal

### Endpoints Disponibles

#### Servicios (CRUD)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/services` | Listar todos los servicios |
| POST | `/api/services` | Crear un nuevo servicio |
| GET | `/api/services/{id}` | Obtener un servicio específico |
| PUT | `/api/services/{id}` | Actualizar un servicio |
| DELETE | `/api/services/{id}` | Eliminar un servicio |

#### Control de Servicios

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/services/{id}/start` | Iniciar un servicio |
| POST | `/api/services/{id}/stop` | Detener un servicio |
| GET | `/api/services/{id}/status` | Obtener estado del servicio |
| POST | `/api/services/{id}/execute` | Ejecutar el servicio |
| POST | `/api/services/{id}/invoke` | Invocar con parámetros |
| GET | `/api/services/{id}/dockerfile` | Ver Dockerfile generado |

#### Operaciones Bulk

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/services/bulk/start` | Iniciar todos los servicios |
| POST | `/api/services/bulk/stop` | Detener todos los servicios |
| GET | `/api/services/bulk/status` | Estado de todos los servicios |
| POST | `/api/services/bulk/sync` | Sincronizar con Docker |

##  Ejemplos de API

### Crear Servicio

**Request:**
```bash
curl -X POST http://localhost:3000/api/services \
  -H "Content-Type: application/json" \
  -d '{"name": "Calculator", "language": "python", "type": "execution", "code": "def add(a, b): return a + b"}'
```

**Response (201):**
```json
{
  "id": "abc-123",
  "name": "Calculator",
  "language": "python",
  "type": "execution",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### Iniciar Servicio

**Request:**
```bash
curl -X POST http://localhost:3000/api/services/{id}/start
```

**Response (200):**
```json
{
  "message": "Service started successfully",
  "status": "running",
  "endpoint": "http://localhost:3000/{id}",
  "port": 45629
}
```

### Ver Estado

**Request:**
```bash
curl http://localhost:3000/api/services/{id}/status
```

**Response (200):**
```json
{
  "serviceId": "{id}",
  "status": "running",
  "endpoint": "http://localhost:3000/{id}",
  "port": 45629
}
```

### Invocar con Parámetros

**Request:**
```bash
curl -X POST http://localhost:3000/api/services/{id}/invoke \
  -H "Content-Type: application/json" \
  -d '{"a": 5, "b": 10}'
```

**Response (200):**
```json
{
  "success": true,
  "result": 15
}
```

##  Tipos de Servicios

### Execution
Servicios estándar que ejecutan código personalizado.

```json
{
  "name": "Calculator",
  "type": "execution",
  "language": "python",
  "code": "def add(a, b): return a + b"
}
```

### Roble
Servicios integrados con Roble para bases de datos.

```json
{
  "name": "Database Service",
  "type": "roble",
  "tokenDatabase": "tu_token",
  "code": "SELECT * FROM users"
}
```

## Arquitectura

### Diagrama del Sistema

```
Usuario → Dashboard → API Routes → Container Manager → Docker Engine
```

### Componentes

| Componente | Función |
|------------|---------|
| **Dashboard (Next.js)** | Interfaz web para gestionar servicios |
| **API Routes** | Endpoints REST para control |
| **Container Manager** | Gestión de contenedores Docker |
| **Docker Engine** | Ejecución de contenedores |

### Estructura del Proyecto

```
micro_services/
├── app/              # Next.js App Router
│   ├── api/         # API endpoints
│   └── page.tsx     # Dashboard
├── components/       # React components
├── lib/             # Lógica de negocio
│   ├── backend/    # Container manager, validators
│   └── docker/     # Dockerfile generation
└── docker-compose.yml
```

### Contenedores

| Característica | Valor |
|----------------|-------|
| **Nombre** | `microservice-{id}` |
| **Red** | `microservices_net` |
| **Puerto** | Dinámico (base 45000) |
| **Restart** | `unless-stopped` |
| **Health Check** | 30s |

##  Scripts

```bash
npm run dev      # Desarrollo
npm run build    # Build producción
npm start        # Servidor producción
npm run lint     # Linter
```

##  Cómo Funcionan los Contenedores

### Flujo de Creación

1. Usuario crea servicio → Sistema genera Dockerfile
2. Docker construye imagen → Crea contenedor → Inicia
3. Health checks cada 30s → Auto-restart si falla

### Estructura del Contenedor

```
microservice-{id}/
├── Dockerfile
├── main.py/index.js
├── requirements.txt
└── /app
```

### Endpoints del Contenedor

- `GET /` - Info del servicio
- `GET /health` - Health check
- `POST /execute` - Ejecutar código

##  Construcción y Ejecución de Contenedores

### Opción 1: Dashboard (Recomendado)

1. Ve a `http://localhost:3000`
2. Completa el formulario
3. Haz clic en "Create Service"
4. El contenedor se construye y ejecuta automáticamente

### Opción 2: API

```bash
# Crear servicio
curl -X POST http://localhost:3000/api/services \
  -H "Content-Type: application/json" \
  -d '{"name": "Mi Servicio", "language": "python", "type": "execution", "code": "print(\"Hello\")"}'

# Iniciar (construye y ejecuta)
curl -X POST http://localhost:3000/api/services/{id}/start
```

### Opción 3: Docker Manual

```bash
# Crear red
docker network create microservices_net

# Construir imagen
docker build -t microservice-example -f Dockerfile.example .

# Ejecutar contenedor
docker run -d \
  --name microservice-example \
  --network microservices_net \
  -p 45000:3000 \
  --restart unless-stopped \
  microservice-example

# Ver logs
docker logs -f microservice-example

# Detener
docker stop microservice-example
docker rm microservice-example
```

### Docker Compose

```bash
# Ejecutar
docker-compose -f docker-compose.example.yml up -d

# Ver logs
docker-compose -f docker-compose.example.yml logs -f

# Detener
docker-compose -f docker-compose.example.yml down
```

### Comandos Docker Útiles

```bash
docker ps                        # Ver contenedores corriendo
docker logs -f {id}              # Ver logs en tiempo real
docker stop {id}                 # Detener contenedor
docker rm {id}                   # Eliminar contenedor
docker stats {id}                # Ver uso de recursos
docker network ls                # Ver redes
docker system prune              # Limpiar recursos no usados
```


##  Troubleshooting

| Problema | Solución |
|----------|----------|
| Docker no corre | `sudo systemctl start docker` o iniciar Docker Desktop |
| Puerto ocupado | Cambiar `SERVICE_BASE_PORT` en `.env.local` |
| Permisos Docker | `sudo usermod -aG docker $USER` |
| Contenedor no inicia | `docker logs microservice-{id}` |
| Red no existe | `docker network create microservices_net` |
| Variables no cargan | Verificar que `.env.local` existe |
| Servicios no crean | Verificar `ENABLE_DOCKER_RUNTIME=true` |
