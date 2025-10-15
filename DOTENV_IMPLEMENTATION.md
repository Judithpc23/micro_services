# 🔧 Implementación de python-dotenv y dotenv

## 📋 **Resumen de Cambios**

Se ha implementado el uso de librerías especializadas para el manejo de variables de entorno en lugar de usar `os.getenv()` directamente.

## ✅ **Cambios Implementados**

### **1. Python - python-dotenv**

#### **Antes (❌ Manual):**
```python
# Cargar variables de entorno desde archivo .env local
def load_env_file():
    """Cargar variables de entorno desde archivo .env local"""
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
        print(f"✅ Variables cargadas desde {env_path}")
    else:
        print(f"⚠️ Archivo .env no encontrado en {env_path}")

# Cargar variables de entorno
load_env_file()

# Configuración de Roble
ROBLE_BASE_URL = os.getenv('ROBLE_BASE_HOST')
ROBLE_CONTRACT = os.getenv('ROBLE_CONTRACT')
TABLE_NAME = os.getenv('TABLE_NAME')
```

#### **Después (✅ python-dotenv):**
```python
# Cargar variables de entorno usando python-dotenv
from dotenv import load_dotenv

# Cargar automáticamente desde .env.local (prioridad) o .env
load_dotenv('.env.local')  # Intenta cargar .env.local primero
load_dotenv('.env')         # Fallback a .env si .env.local no existe
load_dotenv()               # Fallback a archivo .env en directorio actual

print("✅ Variables de entorno cargadas con python-dotenv")

# Configuración de Roble con validación
def get_required_env(key: str, description: str = None) -> str:
    """Obtener variable de entorno requerida con validación"""
    value = os.getenv(key)
    if not value:
        error_msg = f"Variable de entorno requerida no encontrada: {key}"
        if description:
            error_msg += f" ({description})"
        raise ValueError(error_msg)
    return value

def get_optional_env(key: str, default: str = None) -> str:
    """Obtener variable de entorno opcional"""
    return os.getenv(key, default)

# Cargar configuración con validación
try:
    ROBLE_BASE_URL = get_required_env('ROBLE_BASE_HOST', 'URL base de la API de Roble')
    ROBLE_CONTRACT = get_required_env('ROBLE_CONTRACT', 'Contrato de Roble')
    TABLE_NAME = get_required_env('TABLE_NAME', 'Nombre de la tabla')
    ROBLE_USER_EMAIL = get_optional_env('ROBLE_USER_EMAIL')
    ROBLE_USER_PASSWORD = get_optional_env('ROBLE_USER_PASSWORD')
    ROBLE_TOKEN = get_optional_env('ROBLE_TOKEN')
    ROBLE_MODE = get_optional_env('ROBLE_MODE', 'current')
    
    print(f"✅ Configuración Roble cargada:")
    print(f"   - Base URL: {ROBLE_BASE_URL}")
    print(f"   - Contract: {ROBLE_CONTRACT}")
    print(f"   - Table: {TABLE_NAME}")
    print(f"   - Mode: {ROBLE_MODE}")
    
except ValueError as e:
    print(f"❌ Error de configuración: {e}")
    print("💡 Asegúrate de tener las variables requeridas en .env.local")
    raise
```

### **2. JavaScript - dotenv**

#### **Antes (❌ Manual):**
```javascript
const ROBLE_BASE_URL = process.env.ROBLE_BASE_HOST;
const DEFAULT_DBNAME = process.env.ROBLE_CONTRACT;
const TABLE_NAME = process.env.TABLE_NAME;
```

#### **Después (✅ dotenv):**
```javascript
require('dotenv').config({ path: '.env.local' }); // Cargar .env.local primero
require('dotenv').config(); // Fallback a .env

// Configuración con validación
function getRequiredEnv(key, description) {
  const value = process.env[key];
  if (!value) {
    const errorMsg = `Variable de entorno requerida no encontrada: ${key}`;
    const fullError = description ? `${errorMsg} (${description})` : errorMsg;
    throw new Error(fullError);
  }
  return value;
}

function getOptionalEnv(key, defaultValue = null) {
  return process.env[key] || defaultValue;
}

// Cargar configuración con validación
let ROBLE_BASE_URL, DEFAULT_DBNAME, TABLE_NAME, ROBLE_EMAIL, ROBLE_PASSWORD, ROBLE_TOKEN, ROBLE_MODE;

try {
  ROBLE_BASE_URL = getRequiredEnv('ROBLE_BASE_HOST', 'URL base de la API de Roble');
  DEFAULT_DBNAME = getRequiredEnv('ROBLE_CONTRACT', 'Contrato de Roble');
  TABLE_NAME = getRequiredEnv('TABLE_NAME', 'Nombre de la tabla');
  ROBLE_EMAIL = getOptionalEnv('ROBLE_USER_EMAIL');
  ROBLE_PASSWORD = getOptionalEnv('ROBLE_USER_PASSWORD');
  ROBLE_TOKEN = getOptionalEnv('ROBLE_TOKEN');
  ROBLE_MODE = getOptionalEnv('ROBLE_MODE', 'current');
  
  console.log('✅ Configuración Roble cargada:');
  console.log(`   - Base URL: ${ROBLE_BASE_URL}`);
  console.log(`   - Contract: ${DEFAULT_DBNAME}`);
  console.log(`   - Table: ${TABLE_NAME}`);
  console.log(`   - Mode: ${ROBLE_MODE}`);
  
} catch (error) {
  console.error(`❌ Error de configuración: ${error.message}`);
  console.log('💡 Asegúrate de tener las variables requeridas en .env.local');
  process.exit(1);
}
```

## 🎯 **Beneficios de la Implementación**

### **1. Librerías Especializadas**
- ✅ **python-dotenv**: Manejo robusto de archivos .env
- ✅ **dotenv**: Equivalente para Node.js
- ✅ **Validación automática**: Detección de archivos faltantes
- ✅ **Prioridad de archivos**: .env.local > .env > variables del sistema

### **2. Validación Robusta**
- ✅ **Variables requeridas**: Validación automática con mensajes descriptivos
- ✅ **Variables opcionales**: Valores por defecto seguros
- ✅ **Mensajes de error claros**: Indicaciones específicas sobre qué configurar
- ✅ **Fail-fast**: El servicio no inicia si faltan variables críticas

### **3. Mejor Experiencia de Desarrollo**
- ✅ **Logs informativos**: Muestra qué configuración se cargó
- ✅ **Mensajes de ayuda**: Guía al desarrollador sobre qué variables necesita
- ✅ **Carga automática**: No requiere código manual para cargar archivos
- ✅ **Fallback inteligente**: Múltiples fuentes de configuración

## 📋 **Dependencias Actualizadas**

### **Python (requirements.txt):**
```
flask==2.3.3
requests==2.31.0
python-dotenv==1.0.0  # ✅ Agregada
```

### **JavaScript (package.json):**
```
express==4.18.2
axios==1.6.0
dotenv==16.3.1  # ✅ Ya incluida
```

## 🔧 **Configuración Requerida**

### **Archivo .env.local:**
```bash
# Configuración Roble (REQUERIDAS)
ROBLE_BASE_HOST=https://roble-api.openlab.uninorte.edu.co
ROBLE_CONTRACT=tu_contract_aqui
TABLE_NAME=mi_tabla

# Autenticación (REQUERIDAS para modo current)
ROBLE_USER_EMAIL=usuario@ejemplo.com
ROBLE_USER_PASSWORD=password123

# Opcionales
ROBLE_TOKEN=token_directo
ROBLE_MODE=current
HTTP_TIMEOUT=5000
```

## 🚀 **Ventajas de la Nueva Implementación**

1. **🔒 Seguridad mejorada**: Validación automática de variables críticas
2. **🛠️ Mantenibilidad**: Código más limpio y especializado
3. **📝 Mejor debugging**: Mensajes de error claros y informativos
4. **⚡ Carga automática**: No requiere configuración manual
5. **🔄 Fallback inteligente**: Múltiples fuentes de configuración
6. **📊 Logs informativos**: Visibilidad de qué configuración se está usando

## ⚠️ **Consideraciones**

- **Variables requeridas**: El servicio fallará al inicio si faltan variables críticas
- **Archivo .env.local**: Debe existir con las variables necesarias
- **Permisos**: .env.local debe tener permisos restrictivos (600)
- **No versionar**: .env.local debe estar en .gitignore

## 🎉 **Resultado Final**

Los microservicios tipo Roble ahora usan librerías especializadas para el manejo de variables de entorno, proporcionando:

- ✅ **Carga automática** de archivos .env
- ✅ **Validación robusta** de configuración
- ✅ **Mensajes de error claros** para debugging
- ✅ **Mejor experiencia de desarrollo**
- ✅ **Seguridad mejorada** con validación automática
