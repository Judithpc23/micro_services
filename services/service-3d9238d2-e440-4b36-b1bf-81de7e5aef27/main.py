from flask import Flask, request, jsonify
import os
import requests
import json

app = Flask(__name__)

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
    TABLE_NAME = get_required_env('TABLE_NAME', 'Nombre de la tabla')
    ROBLE_MODE = get_optional_env('ROBLE_MODE', 'current')
    
    # Cargar configuración según el modo
    if ROBLE_MODE == 'different':
        # Para modo 'different', usar credenciales específicas del servicio
        ROBLE_CONTRACT = get_required_env('ROBLE_SERVICE_CONTRACT', 'Contrato específico del servicio')
        ROBLE_USER_EMAIL = get_optional_env('ROBLE_SERVICE_EMAIL')
        ROBLE_USER_PASSWORD = get_optional_env('ROBLE_SERVICE_PASSWORD')
        ROBLE_TOKEN = get_optional_env('ROBLE_SERVICE_TOKEN')
        print(f"✅ Configuración Roble (modo diferente proyecto):")
        print(f"   - Base URL: {ROBLE_BASE_URL}")
        print(f"   - Contract: {ROBLE_CONTRACT}")
        print(f"   - Table: {TABLE_NAME}")
        print(f"   - Mode: {ROBLE_MODE}")
        print(f"   - Email configurado: {bool(ROBLE_USER_EMAIL)}")
        print(f"   - Password configurado: {bool(ROBLE_USER_PASSWORD)}")
        print(f"   - Token configurado: {bool(ROBLE_TOKEN)}")
    else:
        # Para modo 'current', usar credenciales globales del entorno
        ROBLE_CONTRACT = get_required_env('ROBLE_CONTRACT', 'Contrato global de Roble')
        ROBLE_USER_EMAIL = get_optional_env('ROBLE_USER_EMAIL')
        ROBLE_USER_PASSWORD = get_optional_env('ROBLE_USER_PASSWORD')
        ROBLE_TOKEN = get_optional_env('ROBLE_TOKEN')
        print(f"✅ Configuración Roble (modo proyecto actual):")
        print(f"   - Base URL: {ROBLE_BASE_URL}")
        print(f"   - Contract: {ROBLE_CONTRACT}")
        print(f"   - Table: {TABLE_NAME}")
        print(f"   - Mode: {ROBLE_MODE}")
    
except ValueError as e:
    print(f"❌ Error de configuración: {e}")
    if ROBLE_MODE == 'different':
        print("💡 Para modo 'different', asegúrate de proporcionar ROBLE_SERVICE_CONTRACT y credenciales en el formulario")
    else:
        print("💡 Asegúrate de tener las variables requeridas en .env.local")
    raise

# Cliente Roble para operaciones de base de datos
class RobleClient:
    def __init__(self, base_url, contract):
        self.base_url = base_url
        self.contract = contract
        self.database_url = f"{base_url}/database/{contract}"
        self._token = None
        self._email = ROBLE_USER_EMAIL
        self._password = ROBLE_USER_PASSWORD
        self._roble_mode = ROBLE_MODE
    
    def _get_token(self):
        """Obtener token de autenticación, renovando si es necesario"""
        if self._token:
            return self._token
            
        # Para modo 'current', usar credenciales de entorno
        if self._roble_mode == 'current':
            if self._email and self._password:
                return self._authenticate_with_credentials()
        else:
            # Para modo 'different', usar token directo o credenciales del servicio
            direct_token = ROBLE_TOKEN
            if direct_token:
                self._token = direct_token
                return self._token
            elif self._email and self._password:
                return self._authenticate_with_credentials()
        
        raise Exception("No se pudo obtener token de autenticación")
    
    def _authenticate_with_credentials(self):
        """Autenticar usando email y password"""
        # Verificar que el contract no esté vacío
        if not self.contract or self.contract.strip() == "":
            raise Exception("ROBLE_CONTRACT no está configurado")
        
        auth_url = f"{self.base_url}/auth/{self.contract}/login"
        auth_data = {
            "email": self._email,
            "password": self._password
        }
        
        # Debug: imprimir la URL
        print(f"DEBUG: Intentando autenticar en: {auth_url}")
        print(f"DEBUG: Email: {self._email}")
        print(f"DEBUG: Password configurado: {bool(self._password)}")
        print(f"DEBUG: Contract: {self.contract}")
        
        try:
            response = requests.post(auth_url, json=auth_data)
            print(f"DEBUG: Response status: {response.status_code}")
            print(f"DEBUG: Response text: {response.text[:200]}")
            
            if response.ok:
                auth_result = response.json()
                self._token = auth_result.get('accessToken')
                print(f"DEBUG: Autenticación exitosa, token obtenido")
                return self._token
            else:
                # Proporcionar información más específica sobre el error
                error_detail = response.text
                if response.status_code == 401:
                    if "no verificado" in error_detail.lower() or "not verified" in error_detail.lower():
                        raise Exception(f"Error 401: El usuario {self._email} no está verificado. Verifica tu email en Roble antes de continuar.")
                    elif "no encontrado" in error_detail.lower() or "not found" in error_detail.lower():
                        raise Exception(f"Error 401: El usuario {self._email} no existe en Roble. Crea una cuenta primero.")
                    else:
                        raise Exception(f"Error 401: Credenciales incorrectas para {self._email}. Verifica email y contraseña.")
                else:
                    raise Exception(f"Error de autenticación: {response.status_code} - {error_detail}")
        except Exception as e:
            raise Exception(f"Error conectando con Roble: {str(e)}")
    
    def read_records(self, table_name, filters=None):
        """Leer registros de la tabla"""
        url = f"{self.database_url}/read"
        params = {"tableName": table_name}
        if filters:
            params.update(filters)
        
        token = self._get_token()
        response = requests.get(url, 
            headers={"Authorization": f"Bearer {token}"},
            params=params
        )
        
        # Si el token expiró, intentar renovar
        if response.status_code == 401:
            self._token = None  # Limpiar token expirado
            token = self._get_token()  # Obtener nuevo token
            response = requests.get(url, 
                headers={"Authorization": f"Bearer {token}"},
                params=params
            )
        
        return response.json() if response.ok else []
    
    def insert_records(self, table_name, records):
        """Insertar registros en la tabla"""
        url = f"{self.database_url}/insert"
        data = {
            "tableName": table_name,
            "records": records
        }
        
        token = self._get_token()
        response = requests.post(url,
            headers={"Authorization": f"Bearer {token}"},
            json=data
        )
        
        # Si el token expiró, intentar renovar
        if response.status_code == 401:
            self._token = None  # Limpiar token expirado
            token = self._get_token()  # Obtener nuevo token
            response = requests.post(url,
                headers={"Authorization": f"Bearer {token}"},
                json=data
            )
        
        return response.json() if response.ok else {"success": False}
    
    def update_record(self, table_name, id_column, id_value, updates):
        """Actualizar un registro"""
        url = f"{self.database_url}/update"
        data = {
            "tableName": table_name,
            "idColumn": id_column,
            "idValue": id_value,
            "updates": updates
        }
        
        token = self._get_token()
        response = requests.put(url,
            headers={"Authorization": f"Bearer {token}"},
            json=data
        )
        
        # Si el token expiró, intentar renovar
        if response.status_code == 401:
            self._token = None  # Limpiar token expirado
            token = self._get_token()  # Obtener nuevo token
            response = requests.put(url,
                headers={"Authorization": f"Bearer {token}"},
                json=data
            )
        
        return response.json() if response.ok else {"success": False}
    
    def delete_record(self, table_name, id_column, id_value):
        """Eliminar un registro"""
        url = f"{self.database_url}/delete"
        data = {
            "tableName": table_name,
            "idColumn": id_column,
            "idValue": id_value
        }
        
        token = self._get_token()
        response = requests.delete(url,
            headers={"Authorization": f"Bearer {token}"},
            json=data
        )
        
        # Si el token expiró, intentar renovar
        if response.status_code == 401:
            self._token = None  # Limpiar token expirado
            token = self._get_token()  # Obtener nuevo token
            response = requests.delete(url,
                headers={"Authorization": f"Bearer {token}"},
                json=data
            )
        
        return response.json() if response.ok else {"success": False}

# Instancia global del cliente Roble
roble = RobleClient(ROBLE_BASE_URL, ROBLE_CONTRACT)

@app.route('/')
def home():
    return jsonify({
        "message": "Roble Service ready",
        "serviceId": "3d9238d2-e440-4b36-b1bf-81de7e5aef27",
        "tableName": TABLE_NAME,
        "endpoint": f"http://localhost:3000/3d9238d2-e440-4b36-b1bf-81de7e5aef27",
        "status": "running"
    })

@app.route('/health')
def health():
    return jsonify({"status": "healthy"})

@app.route('/execute', methods=['GET', 'POST'])
def execute():
    try:
        params = {}
        if request.method == 'POST':
            params.update(request.get_json() or {})
        params.update(request.args.to_dict())
    
        # Hacer parámetros disponibles como variables locales
        for key, value in params.items():
            locals()[key] = value

        # Variables helper para el código del usuario
        def read_data(filters=None):
            return roble.read_records(TABLE_NAME, filters)
        
        def insert_data(records):
            return roble.insert_records(TABLE_NAME, records)
        
        def update_data(record_id, updates):
            return roble.update_record(TABLE_NAME, '_id', record_id, updates)
        
        def delete_data(record_id):
            return roble.delete_record(TABLE_NAME, '_id', record_id)
        
        # Ejecutar el código personalizado del usuario
        # Roble Microservice - Python
        # This service can interact with your Roble database
        
        def main():
            # Example: Read all records from the table
            records = read_data()
            print(f"Found {len(records)} records")
            
            # Process the records as needed
            for record in records:
                print(f"Record ID: {record.get('_id')}")
                print(f"Data: {record}")
            
            return {
                "message": "Roble microservice executed successfully",
                "records_count": len(records),
                "records": records,
                "status": "completed"
            }
        
        # Available helper functions:
        # - read_data(filters=None): Read records from the table
        # - insert_data(records): Insert new records
        # - update_data(record_id, updates): Update a specific record
        # - delete_data(record_id): Delete a specific record
        
        # Si el código define una función, ejecutarla automáticamente
        result = "Execution completed"
        
        # Buscar y ejecutar solo la función main del usuario
        local_vars = locals()
        if 'main' in local_vars and callable(local_vars['main']):
            try:
                result = local_vars['main']()
            except Exception as func_error:
                result = f"Error ejecutando función main: {str(func_error)}"
        else:
            # Si no hay función main, buscar otras funciones definidas por el usuario
            for name, obj in local_vars.items():
                if callable(obj) and not name.startswith('_') and name != 'execute' and name not in ['read_data', 'insert_data', 'update_data', 'delete_data']:
                    try:
                        result = obj()
                        break
                    except Exception as func_error:
                        result = f"Error ejecutando función {name}: {str(func_error)}"
                        break
        
        return jsonify({
            "success": True,
            "result": result,
            "params": params
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3000))
    app.run(host='0.0.0.0', port=port, debug=False)
