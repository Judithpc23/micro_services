# 🔧 Configuración de Variables de Entorno

## 🚨 **Problema Actual**

Si ves este error:
```
ValueError: Variable de entorno requerida no encontrada: ROBLE_BASE_HOST
```

Es porque falta el archivo `.env.local` con las variables de entorno.

## ✅ **Solución Rápida**

### **Opción 1: Script Automático (Recomendado)**
```bash
npm run setup-env
```

### **Opción 2: Manual**
```bash
# 1. Crear archivo .env.local
touch .env.local

# 2. Editar con tus credenciales
nano .env.local
```

## 📋 **Contenido del archivo .env.local**

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

## 🚀 **Pasos Completos**

### **1. Configurar variables**
```bash
npm run setup-env
```

### **2. Editar credenciales**
```bash
# Editar .env.local con tus credenciales reales
nano .env.local
```

### **3. Reiniciar servicios**
```bash
# Parar servicios
docker-compose down

# Reconstruir y levantar
docker-compose up --build
```

## 🔍 **Verificación**

### **Verificar que funciona:**
```bash
# Ver logs del servicio
docker-compose logs -f

# Debería mostrar:
# ✅ Variables de entorno cargadas con python-dotenv
# ✅ Configuración Roble cargada:
#    - Base URL: https://roble-api.openlab.uninorte.edu.co
#    - Contract: tu_contract_aqui
#    - Table: microservices
#    - Mode: current
```

## ⚠️ **Importante**

1. **No versionar .env.local**: Debe estar en `.gitignore`
2. **Permisos restrictivos**: `chmod 600 .env.local`
3. **Credenciales reales**: Actualiza con tus valores de Roble
4. **Ubicación correcta**: En la raíz del proyecto (mismo nivel que `package.json`)

## 🎯 **Estructura de Archivos**

```
micro_services/
├── .env.local          # ✅ Variables de entorno (crear)
├── .env.local.example  # 📄 Ejemplo (opcional)
├── setup-env.js        # 🔧 Script de configuración
├── docker-compose.yml
├── package.json
└── services/
```

## 🆘 **Si sigue fallando**

### **Verificar archivo existe:**
```bash
ls -la .env.local
```

### **Verificar contenido:**
```bash
cat .env.local
```

### **Verificar permisos:**
```bash
chmod 600 .env.local
```

### **Verificar variables en contenedor:**
```bash
docker exec -it microservice-xxx env | grep ROBLE
```

## 🎉 **Resultado Esperado**

Después de configurar correctamente:

```
✅ Variables de entorno cargadas con python-dotenv
✅ Configuración Roble cargada:
   - Base URL: https://roble-api.openlab.uninorte.edu.co
   - Contract: tu_contract_aqui
   - Table: microservices
   - Mode: current
```

¡El servicio debería iniciar sin errores!
