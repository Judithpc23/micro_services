from flask import Flask, request, jsonify
import os
import requests
import json

app = Flask(__name__)

# Configuración de Roble
ROBLE_BASE_URL = os.getenv('ROBLE_BASE_HOST', 'https://roble-api.openlab.uninorte.edu.co')
ROBLE_CONTRACT = os.getenv('ROBLE_CONTRACT', '')
TABLE_NAME = 'microservices'

# Cliente Roble para operaciones de base de datos
class RobleClient:
    def __init__(self, base_url, contract):
        self.base_url = base_url
        self.contract = contract
        self.database_url = f"{base_url}/database/{contract}"
        self._token = None
        self._email = os.getenv('ROBLE_USER_EMAIL', '')
        self._password = os.getenv('ROBLE_USER_PASSWORD', '')
        self._roble_mode = 'current'
    
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
            direct_token = os.getenv('ROBLE_TOKEN', '')
            if direct_token:
                self._token = direct_token
                return self._token
            elif self._email and self._password:
                return self._authenticate_with_credentials()
        
        raise Exception("No se pudo obtener token de autenticación")
    
    def _authenticate_with_credentials(self):
        """Autenticar usando email y password"""
        auth_url = f"{self.base_url}/auth/{self.contract}/login"
        auth_data = {
            "email": self._email,
            "password": self._password
        }
        
        try:
            response = requests.post(auth_url, json=auth_data)
            if response.ok:
                auth_result = response.json()
                self._token = auth_result.get('accessToken')
                return self._token
            else:
                raise Exception(f"Error de autenticación: {response.status_code}")
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
        "serviceId": "e1208190-d415-4f62-90bf-d55626ed16d2",
        "tableName": TABLE_NAME,
        "endpoint": f"http://localhost:3000/e1208190-d415-4f62-90bf-d55626ed16d2",
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
        def main():
            records = read_data()
            return {
                "message": "Roble microservice executed successfully",
                "records_count": len(records),
                "status": "completed"
            }
        
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
