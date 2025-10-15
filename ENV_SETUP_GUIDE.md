# 🔧 Guía de Configuración: Variables de Entorno

## 🚨 **Problema Actual**

El error indica que las variables de entorno no se están cargando:

```
ValueError: Variable de entorno requerida no encontrada: ROBLE_BASE_HOST (URL base de la API de Roble)
```

## ✅ **Solución: Crear archivo .env.local**

### **1. Crear el archivo .env.local**

Crea un archivo `.env.local` en la **raíz del proyecto** (mismo nivel que `package.json`):

```bash
# .env.local
ROBLE_BASE_HOST=https://roble-api.openlab.uninorte.edu.co
ROBLE_CONTRACT=tu_contract_aqui
ROBLE_USER_EMAIL=usuario@ejemplo.com
ROBLE_USER_PASSWORD=password123
SYNC_MICROSERVICES_TO_ROBLE=true
```

### **2. Estructura de archivos correcta**

```
micro_services/
├── .env.local          # ✅ Archivo de variables (crear este)
├── docker-compose.yml
├── package.json
├── services/
│   └── service-xxx/
└── lib/
```

### **3. Contenido del archivo .env.local**

```bash
# Configuración Roble - Variables Requeridas
ROBLE_BASE_HOST=https://roble-api.openlab.uninorte.edu.co
ROBLE_CONTRACT=tu_contract_aqui
ROBLE_USER_EMAIL=usuario@ejemplo.com
ROBLE_USER_PASSWORD=password123

# Variables Opcionales
SYNC_MICROSERVICES_TO_ROBLE=true
ROBLE_MODE=current
HTTP_TIMEOUT=5000
```

## 🔧 **Verificación**

### **1. Verificar que el archivo existe:**
```bash
ls -la .env.local
# Debería mostrar el archivo
```

### **2. Verificar permisos:**
```bash
chmod 600 .env.local
# Permisos restrictivos para seguridad
```

### **3. Verificar contenido:**
```bash
cat .env.local
# Debería mostrar las variables
```

## 🐳 **Docker Compose**

El `docker-compose.yml` ya está configurado correctamente:

```yaml
services:
  service-id:
    env_file:
      - .env.local  # ✅ Carga automáticamente las variables
    environment:
      - SERVICE_NAME=nombre_servicio
      - SERVICE_TYPE=roble
      - TABLE_NAME=mi_tabla
```

## 🚀 **Pasos para Resolver**

### **Paso 1: Crear .env.local**
```bash
# En la raíz del proyecto
touch .env.local
```

### **Paso 2: Agregar variables**
```bash
# Editar el archivo
nano .env.local
# o
code .env.local
```

### **Paso 3: Configurar variables**
```bash
ROBLE_BASE_HOST=https://roble-api.openlab.uninorte.edu.co
ROBLE_CONTRACT=tu_contract_aqui
ROBLE_USER_EMAIL=usuario@ejemplo.com
ROBLE_USER_PASSWORD=password123
SYNC_MICROSERVICES_TO_ROBLE=true
```

### **Paso 4: Reiniciar servicios**
```bash
# Parar servicios
docker-compose down

# Reconstruir y levantar
docker-compose up --build
```

## 🔍 **Debugging**

### **Verificar variables en el contenedor:**
```bash
# Entrar al contenedor
docker exec -it microservice-xxx bash

# Verificar variables
env | grep ROBLE
```

### **Verificar archivo .env.local:**
```bash
# En el contenedor
cat .env.local
```

## ⚠️ **Consideraciones de Seguridad**

1. **No versionar .env.local**: Debe estar en `.gitignore`
2. **Permisos restrictivos**: `chmod 600 .env.local`
3. **Variables sensibles**: No compartir credenciales
4. **Entornos separados**: Diferentes archivos para dev/prod

## 🎯 **Variables Requeridas**

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `ROBLE_BASE_HOST` | URL base de la API | ✅ SÍ |
| `ROBLE_CONTRACT` | Contrato de Roble | ✅ SÍ |
| `ROBLE_USER_EMAIL` | Email de usuario | ✅ SÍ |
| `ROBLE_USER_PASSWORD` | Password de usuario | ✅ SÍ |
| `SYNC_MICROSERVICES_TO_ROBLE` | Habilitar sincronización | ❌ NO |

## 🎉 **Resultado Esperado**

Después de crear `.env.local` con las variables correctas:

```
✅ Variables de entorno cargadas con python-dotenv
✅ Configuración Roble cargada:
   - Base URL: https://roble-api.openlab.uninorte.edu.co
   - Contract: tu_contract_aqui
   - Table: microservices
   - Mode: current
```

¡El servicio debería iniciar sin errores!
