# 🔒 Cambios de Seguridad en Variables de Entorno

## 📋 **Resumen de Cambios Implementados**

Se han implementado cambios de seguridad para seguir las mejores prácticas en el manejo de variables de entorno en microservicios tipo Roble.

## ✅ **Cambios Realizados**

### 1. **Eliminación de Secretos Hardcodeados en Dockerfile**
- ❌ **ANTES**: Secretos hardcodeados en el Dockerfile
```dockerfile
ENV ROBLE_TOKEN="${service.robleToken}"
ENV ROBLE_USER_EMAIL="${service.robleEmail}"
ENV ROBLE_USER_PASSWORD="${service.roblePassword}"
```
- ✅ **DESPUÉS**: Solo variables no sensibles
```dockerfile
ENV SERVICE_NAME="${service.name}"
ENV SERVICE_TYPE="${service.type}"
```

### 2. **Uso de env_file en Docker Compose**
- ❌ **ANTES**: Variables individuales en docker-compose
```yaml
environment:
  - ROBLE_USER_EMAIL=usuario@ejemplo.com
  - ROBLE_USER_PASSWORD=password123
```
- ✅ **DESPUÉS**: Uso de env_file
```yaml
environment:
  - SERVICE_NAME=nombre_servicio
  - SERVICE_TYPE=roble
  - TABLE_NAME=tabla_especifica
env_file:
  - .env.local
```

### 3. **Eliminación de Valores por Defecto Hardcodeados**
- ❌ **ANTES**: Valores por defecto en el código
```python
ROBLE_BASE_URL = os.getenv('ROBLE_BASE_HOST', 'https://roble-api.openlab.uninorte.edu.co')
ROBLE_CONTRACT = os.getenv('ROBLE_CONTRACT', '${service.robleContract || ""}')
```
- ✅ **DESPUÉS**: Solo lectura de variables de entorno
```python
ROBLE_BASE_URL = os.getenv('ROBLE_BASE_HOST')
ROBLE_CONTRACT = os.getenv('ROBLE_CONTRACT')
```

### 4. **Eliminación de Copia de Archivo .env**
- ❌ **ANTES**: Se copiaba .env.local al contenedor
```typescript
await this.createServiceEnvFile(serviceDir)
```
- ✅ **DESPUÉS**: Variables se cargan via env_file en docker-compose

### 5. **Actualización del Container Manager**
- ❌ **ANTES**: Variables sensibles pasadas individualmente
```typescript
if (process.env.ROBLE_USER_EMAIL) env.push(`ROBLE_USER_EMAIL=${process.env.ROBLE_USER_EMAIL}`)
if (process.env.ROBLE_USER_PASSWORD) env.push(`ROBLE_USER_PASSWORD=${process.env.ROBLE_USER_PASSWORD}`)
```
- ✅ **DESPUÉS**: Solo variables no sensibles
```typescript
// Variables de entorno se cargan desde .env.local via docker-compose
// No se pasan variables sensibles individualmente por seguridad
```

## 🛡️ **Beneficios de Seguridad**

1. **No más secretos en imágenes Docker**: Los tokens y credenciales no se "hornean" en las imágenes
2. **Gestión centralizada**: Variables sensibles se manejan desde .env.local
3. **Separación de responsabilidades**: Variables de configuración vs variables sensibles
4. **Mejor práctica**: Uso de env_file en lugar de variables individuales
5. **Auditoría mejorada**: Variables sensibles solo en archivos de entorno

## 📝 **Configuración Requerida**

### Archivo .env.local
```bash
# Configuración Roble
ROBLE_BASE_HOST=https://roble-api.openlab.uninorte.edu.co
ROBLE_CONTRACT=tu_contract_aqui
ROBLE_USER_EMAIL=usuario@ejemplo.com
ROBLE_USER_PASSWORD=password123

# Habilitar sincronización con Roble
SYNC_MICROSERVICES_TO_ROBLE=true
```

### Docker Compose Generado
```yaml
services:
  service-id:
    container_name: microservice-service-id
    build:
      context: .
      dockerfile: dockerfiles/Dockerfile.service-id
    ports:
      - "45001:3000"
    environment:
      - SERVICE_NAME=Mi Servicio Roble
      - SERVICE_TYPE=roble
      - TABLE_NAME=mi_tabla
    env_file:
      - .env.local
    restart: unless-stopped
    networks:
      - microservices-network
```

## ⚠️ **Consideraciones Importantes**

1. **Archivo .env.local debe existir**: Sin este archivo, los servicios no tendrán acceso a las variables de Roble
2. **Permisos de archivo**: .env.local debe tener permisos restrictivos (600)
3. **No versionar**: .env.local debe estar en .gitignore
4. **Variables requeridas**: Todas las variables Roble deben estar definidas en .env.local

## 🔄 **Migración**

Los servicios existentes seguirán funcionando, pero para nuevos servicios:
1. Asegúrate de tener .env.local configurado
2. Los servicios leerán variables desde env_file automáticamente
3. No se crearán archivos .env individuales en las carpetas de servicio

## 🎯 **Resultado Final**

- ✅ **Seguridad mejorada**: No más secretos en imágenes Docker
- ✅ **Mejores prácticas**: Uso de env_file en docker-compose
- ✅ **Mantenibilidad**: Configuración centralizada
- ✅ **Auditoría**: Variables sensibles solo en archivos de entorno
