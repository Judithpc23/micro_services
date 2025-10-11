# Sincronización con Roble - Microservicios

## 🎯 **Descripción**

La sincronización automática entre el almacenamiento local y la tabla `microservices` de Roble permite mantener los datos consistentes en ambos sistemas.

## 🔧 **Configuración**

### Variables de Entorno Requeridas

```bash
# Habilitar sincronización con Roble
SYNC_MICROSERVICES_TO_ROBLE=true

# Configuración Roble
ROBLE_BASE_HOST=https://roble-api.openlab.uninorte.edu.co
ROBLE_CONTRACT=tu_contract_aqui
```

## 📊 **Mapeo de Campos**

| Campo Local | Campo Roble | Tipo | Nullable | Descripción |
|-------------|-------------|------|----------|--------------|
| `id` | `_id` | varchar | ❌ NO | Campo primario |
| `id` | `id` | varchar | ❌ NO | Identificador único |
| `name` | `name` | varchar | ✅ SÍ | Nombre del microservicio |
| `description` | `description` | text | ✅ SÍ | Descripción |
| `language` | `language` | varchar | ✅ SÍ | Lenguaje (python/javascript) |
| `code` | `code` | text | ✅ SÍ | Código del microservicio |
| `type` | `type` | varchar | ✅ SÍ | Tipo (execution/roble) |
| - | `status` | varchar | ✅ SÍ | Estado (created/updated/deleted) |
| `createdAt` | `createAt` | timestamp | ✅ SÍ | Fecha de creación |
| - | `updatedAt` | timestamp | ✅ SÍ | Fecha de actualización |

## 🔄 **Operaciones CRUD Sincronizadas**

### ✅ **CREATE (Crear)**
```
Crear Microservicio Local
         ↓
    Guardar en .data/services.json
         ↓
    ¿SYNC_MICROSERVICES_TO_ROBLE=true?
         ↓ SÍ
    Mapear a formato Roble
         ↓
    INSERT en tabla microservices
         ↓
    ✅ Sincronizado
```

### ✅ **UPDATE (Actualizar)**
```
Actualizar Microservicio Local
         ↓
    Actualizar en .data/services.json
         ↓
    ¿SYNC_MICROSERVICES_TO_ROBLE=true?
         ↓ SÍ
    Mapear cambios a formato Roble
         ↓
    UPDATE tabla microservices WHERE id = ?
         ↓
    ✅ Sincronizado
```

### ✅ **DELETE (Eliminar)**
```
Eliminar Microservicio Local
         ↓
    Eliminar de .data/services.json
         ↓
    ¿SYNC_MICROSERVICES_TO_ROBLE=true?
         ↓ SÍ
    DELETE FROM microservices WHERE id = ?
         ↓
    ✅ Sincronizado
```

## 🎛️ **API Endpoints**

### **Sincronización Manual**

#### `POST /api/services/sync-roble`
Sincroniza todos los microservicios con Roble.

**Respuesta:**
```json
{
  "success": true,
  "message": "Synchronization completed: 5 success, 0 failed",
  "results": {
    "success": 5,
    "failed": 0
  }
}
```

#### `GET /api/services/sync-roble`
Verifica el estado de sincronización.

**Respuesta:**
```json
{
  "success": true,
  "status": {
    "enabled": true,
    "robleConnected": true
  }
}
```

## 🔍 **Estados de Sincronización**

| Estado | Descripción |
|--------|-------------|
| `created` | Microservicio recién creado |
| `updated` | Microservicio actualizado |
| `deleted` | Microservicio eliminado |

## 🚨 **Manejo de Errores**

- **Sincronización asíncrona**: No bloquea operaciones locales
- **Logs detallados**: Errores registrados en consola
- **Resiliente**: Fallos de Roble no afectan operaciones locales
- **Reintentos**: Sincronización manual disponible

## 📝 **Ejemplo de Uso**

### 1. **Crear Microservicio**
```typescript
const service = {
  id: "uuid-123",
  name: "Mi Microservicio",
  description: "Descripción del servicio",
  language: "python",
  code: "def handler(): return 'Hello'",
  type: "execution",
  createdAt: new Date()
}

// Se sincroniza automáticamente con Roble
servicesStore.create(service)
```

### 2. **Sincronización Manual**
```bash
# Verificar estado
curl -X GET http://localhost:3000/api/services/sync-roble

# Sincronizar todos
curl -X POST http://localhost:3000/api/services/sync-roble
```

## 🎯 **Beneficios**

1. **Consistencia**: Datos sincronizados entre local y Roble
2. **Transparente**: Operación automática sin intervención manual
3. **Resiliente**: Fallos no afectan funcionalidad local
4. **Auditable**: Logs completos de sincronización
5. **Configurable**: Habilitar/deshabilitar con variable de entorno

## ⚠️ **Consideraciones**

- La sincronización es **asíncrona** y no bloquea operaciones
- Los errores de Roble se registran pero no fallan las operaciones locales
- Se requiere configuración correcta de variables de entorno
- La tabla `microservices` debe existir en Roble con el esquema correcto
