import type { Microservice } from "@/lib/types/microservice"

/**
 * Genera el Dockerfile según el lenguaje del microservicio.
 * - Estándar de puerto por defecto: 3000 (ambos runtimes)
 * - Copia TODO el proyecto (usa .dockerignore)
 * - Expone ${PORT} y fija HOST=0.0.0.0
 */
export function generateDockerfile(service: Microservice): string {
	if (service.language === "python") {
		return generatePythonDockerfile(service)
	} else {
		return generateJavaScriptDockerfile(service)
	}
}

function generatePythonDockerfile(service: Microservice): string {
    const hasTable = service.type === "roble" && !!service.tableName
    const hasContract = service.type === "roble" && !!service.robleContract
    const hasToken = service.type === "roble" && !!service.robleToken
    const hasEmail = service.type === "roble" && !!service.robleEmail
    const hasPassword = service.type === "roble" && !!service.roblePassword

	return `# Dockerfile for ${service.name}
# Language: Python
# Type: ${service.type}
# Optimized with dependency caching

FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \\
		PYTHONUNBUFFERED=1 \\
		HOST=0.0.0.0 \\
		PORT=3000 \\
		SERVICE_NAME="${service.name}" \\
    SERVICE_TYPE="${service.type}"
${hasTable ? `ENV ROBLE_TABLE_NAME="${service.tableName}"` : "# No Roble table configured"}
${hasContract ? `ENV ROBLE_CONTRACT="${service.robleContract}"` : "# No Roble contract configured"}
${hasToken ? `ENV ROBLE_TOKEN="${service.robleToken}"` : "# No Roble token configured"}
${hasEmail ? `ENV ROBLE_USER_EMAIL="${service.robleEmail}"` : "# No Roble email configured"}
${hasPassword ? `ENV ROBLE_USER_PASSWORD="${service.roblePassword}"` : "# No Roble password configured"}

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \\
    pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY --chown=appuser:appuser . /app

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \\
	CMD python -c "import sys,urllib.request as u; u.urlopen('http://127.0.0.1:'+__import__('os').environ.get('PORT','3000')+'/health'); sys.exit(0)" \\
	|| exit 1

EXPOSE ${"${PORT}"}

# Start application
CMD ["python", "main.py"]
`
}

function generateJavaScriptDockerfile(service: Microservice): string {
    const hasTable = service.type === "roble" && !!service.tableName
    const hasContract = service.type === "roble" && !!service.robleContract
    const hasToken = service.type === "roble" && !!service.robleToken
    const hasEmail = service.type === "roble" && !!service.robleEmail
    const hasPassword = service.type === "roble" && !!service.roblePassword

	return `# Dockerfile for ${service.name}
# Language: JavaScript (Node.js)
# Type: ${service.type}
# Optimized with dependency caching

FROM node:18-alpine

# Set environment variables
ENV NODE_ENV=production \\
		HOST=0.0.0.0 \\
		PORT=3000 \\
		SERVICE_NAME="${service.name}" \\
    SERVICE_TYPE="${service.type}"
${hasTable ? `ENV ROBLE_TABLE_NAME="${service.tableName}"` : "# No Roble table configured"}
${hasContract ? `ENV ROBLE_CONTRACT="${service.robleContract}"` : "# No Roble contract configured"}
${hasToken ? `ENV ROBLE_TOKEN="${service.robleToken}"` : "# No Roble token configured"}
${hasEmail ? `ENV ROBLE_USER_EMAIL="${service.robleEmail}"` : "# No Roble email configured"}
${hasPassword ? `ENV ROBLE_USER_PASSWORD="${service.roblePassword}"` : "# No Roble password configured"}

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production --silent && \\
    npm cache clean --force

# Copy application code
COPY --chown=nodejs:nodejs . /app

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \\
	CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT||3000) +'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

EXPOSE ${"${PORT}"}

# Start application
CMD ["node", "index.js"]
`
}

/**
 * Genera los archivos del servicio (Dockerfile, código y dependencias).
 * - Requiere que el servicio ya tenga un entrypoint: main.py o index.js
 * - Requirements/package.json mínimos incluidos para levantar un HTTP básico.
 */
export function generateServiceFiles(service: Microservice): {
	dockerfile: string
	code: string
	dependencies: string
} {
	const dockerfile = generateDockerfile(service)

	if (service.language === "python") {
		// Generar código según el tipo de servicio
		const code = service.type === "roble" 
			? generateRobleFlaskServer(service) 
			: generateFlaskServer(service)
		
		const dependencies = service.type === "roble"
			? `# requirements.txt
flask==3.0.0
requests==2.31.0
`
			: `# requirements.txt
flask==3.0.0
requests==2.31.0
`
		
		return {
			dockerfile,
			code,
			dependencies
		}
	} else {
		// Generar código según el tipo de servicio
		const code = service.type === "roble" 
			? generateRobleExpressServer(service) 
			: generateExpressServer(service)
		
		const pkgName = service.name.toLowerCase().replace(/\s+/g, "-")
		const dependencies = service.type === "roble"
			? `{
	"name": "${pkgName}",
	"version": "1.0.0",
	"type": "commonjs",
	"main": "index.js",
	"scripts": {
		"start": "node index.js"
	},
	"dependencies": {
		"express": "^4.18.2",
		"axios": "^1.5.0"
	}
}`
			: `{
	"name": "${pkgName}",
	"version": "1.0.0",
	"type": "commonjs",
	"main": "index.js",
	"scripts": {
		"start": "node index.js"
	},
	"dependencies": {
		"express": "^4.18.2"
	}
}`
		
		return {
			dockerfile,
			code,
			dependencies
		}
	}
}

/**
 * Genera código de servidor Flask automáticamente
 */
function generateFlaskServer(service: Microservice): string {
	return `from flask import Flask, request, jsonify
import os

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({
        "message": "Service ready",
        "serviceId": "${service.id}",
        "endpoint": f"http://localhost:3000/${service.id}",
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
    
        for key, value in params.items():
            locals()[key] = value

        # Ejecutar el código personalizado del usuario
        ${service.code.replace(/"/g, "'").replace(/\n/g, '\n        ')}
        
        # Si el código define una función, ejecutarla automáticamente
        result = "Execution completed"
        
        # Buscar funciones definidas y ejecutarlas
        local_vars = locals()
        for name, obj in local_vars.items():
            if callable(obj) and not name.startswith('_') and name != 'execute':
                try:
                    result = obj()
                    break  # Ejecutar solo la primera función encontrada
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
`
}

/**
 * Genera código de servidor Express automáticamente
 */
function generateExpressServer(service: Microservice): string {
	return `const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        message: "Service ready",
        serviceId: "${service.id}",
        endpoint: \`http://localhost:3000/${service.id}\`,
        status: "running"
    });
});

app.get('/health', (req, res) => {
    res.json({ status: "healthy" });
});

app.all('/execute', (req, res) => {
    try {
        const params = { ...req.body, ...req.query };

        // Make parameters available as local variables
        Object.keys(params).forEach(key => {
            eval(key + " = params['" + key + "']");
        });
        
        // Aquí va tu código personalizado:
        ${service.code.replace(/"/g, "'").replace(/\n/g, '\n        ')}
        
        res.json({
            success: true,
            result: "Execution completed",
            params: params
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(\`Server running on port \${port}\`);
});
`
}

/**
 * Genera código de servidor Flask para Roble
 */
function generateRobleFlaskServer(service: Microservice): string {
	return `from flask import Flask, request, jsonify
import os
import requests
import json

app = Flask(__name__)

# Configuración de Roble
ROBLE_BASE_URL = os.getenv('ROBLE_BASE_HOST', 'https://roble-api.openlab.uninorte.edu.co')
ROBLE_CONTRACT = os.getenv('ROBLE_CONTRACT', '${service.robleContract || ""}')
TABLE_NAME = '${service.tableName}'

# Cliente Roble para operaciones de base de datos
class RobleClient:
    def __init__(self, base_url, contract):
        self.base_url = base_url
        self.contract = contract
        self.database_url = f"{base_url}/database/{contract}"
        self._token = None
        self._email = os.getenv('ROBLE_USER_EMAIL', '${service.robleEmail || ""}')
        self._password = os.getenv('ROBLE_USER_PASSWORD', '${service.roblePassword || ""}')
        self._roble_mode = '${service.robleMode || "current"}'
    
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
            direct_token = os.getenv('ROBLE_TOKEN', '${service.robleToken || ""}')
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
        "serviceId": "${service.id}",
        "tableName": TABLE_NAME,
        "endpoint": f"http://localhost:3000/${service.id}",
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
        ${service.code.replace(/\n/g, '\n        ')}
        
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
`
}

/**
 * Genera código de servidor Express para Roble (seguro, multi-tenant y sin eval)
 */
function generateRobleExpressServer(service: Microservice): string {
    return `const express = require('express');
  const axios = require('axios');
  
  const app = express();
  app.use(express.json());
  
  // =========================
  // Config Roble
  // =========================
  const ROBLE_BASE_URL = process.env.ROBLE_BASE_HOST || 'https://roble-api.openlab.uninorte.edu.co';
  const DEFAULT_DBNAME = process.env.ROBLE_CONTRACT || '${service.robleContract || ''}';
  const TABLE_NAME = process.env.ROBLE_TABLE_NAME || '${service.tableName || 'microservices'}';
  const HTTP_TIMEOUT = Number(process.env.HTTP_TIMEOUT || 5000); // ms
  
  // Axios base
  const http = axios.create({
    baseURL: ROBLE_BASE_URL,
    timeout: HTTP_TIMEOUT,
  });
  
  // Sanitizar dbName para evitar SSRF/inyecciones en path
  const DBNAME_RE = /^[A-Za-z0-9_-]{1,64}$/;
  
  // =========================
  // Cliente Roble (token passthrough)
  // =========================
  class RobleClient {
    constructor() {}
  
    async verifyToken(dbName, token) {
      const url = \`/auth/\${dbName}/verify-token\`;
      return http.get(url, { headers: { Authorization: \`Bearer \${token}\` } });
    }
  
    async readRecords(dbName, token, tableName, filters = {}) {
      const url = \`/database/\${dbName}/read\`;
      const params = { tableName, ...filters };
      const res = await http.get(url, {
        headers: { Authorization: \`Bearer \${token}\` },
        params,
      });
      return res.data;
    }
  
    async insertRecords(dbName, token, tableName, records) {
      const url = \`/database/\${dbName}/insert\`;
      const res = await http.post(
        url,
        { tableName, records },
        { headers: { Authorization: \`Bearer \${token}\` } }
      );
      return res.data;
    }
  
    async updateRecord(dbName, token, tableName, idColumn, idValue, updates) {
      const url = \`/database/\${dbName}/update\`;
      const res = await http.put(
        url,
        { tableName, idColumn, idValue, updates },
        { headers: { Authorization: \`Bearer \${token}\` } }
      );
      return res.data;
    }
  
    async deleteRecord(dbName, token, tableName, idColumn, idValue) {
      const url = \`/database/\${dbName}/delete\`;
      const res = await http.delete(url, {
        headers: { Authorization: \`Bearer \${token}\` },
        data: { tableName, idColumn, idValue },
      });
      return res.data;
    }
  }
  
  const roble = new RobleClient();
  
  // =========================
  // Utilidades
  // =========================
  function getBearerToken(req) {
    const h = req.headers['authorization'] || '';
    const [scheme, token] = h.split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    return token;
  }
  
  function pickDbName(req) {
    const fromBody = req.body && req.body.dbName;
    const fromQuery = req.query && req.query.dbName;
    const dbName = (fromBody || fromQuery || DEFAULT_DBNAME || '').trim();
    if (!dbName || !DBNAME_RE.test(dbName)) {
      throw Object.assign(new Error('dbName inválido o ausente'), { status: 400 });
    }
    return dbName;
  }
  
  function safeJson(res, status, payload) {
    return res.status(status).json(payload);
  }
  
  // =========================
  // Endpoints
  // =========================
  app.get('/', (req, res) => {
    return res.json({
      message: 'Roble Service ready',
      serviceId: '${service.id}',
      tableName: TABLE_NAME,
      defaultDbName: DEFAULT_DBNAME || null,
      endpoints: {
        execute: \`/execute\`,
        health: '/health'
      },
      status: 'running'
    });
  });
  
  app.get('/health', (req, res) => {
    return res.json({ status: 'healthy' });
  });
  
  // Endpoint principal: recibe Bearer + dbName (dynamic tenant)
  app.all('/execute', async (req, res) => {
    try {
      // 1) Token del usuario
      const token = getBearerToken(req);
      if (!token) {
        return safeJson(res, 401, { success: false, error: 'Missing Authorization: Bearer <token>' });
      }
  
      // 2) dbName del usuario (su proyecto)
      let dbName;
      try {
        dbName = pickDbName(req);
      } catch (e) {
        const code = e.status || 400;
        return safeJson(res, code, { success: false, error: e.message || 'dbName inválido' });
      }
  
      // 3) Verificar token contra ese dbName
      try {
        await roble.verifyToken(dbName, token);
      } catch (e) {
        const code = e?.response?.status || 401;
        return safeJson(res, code, {
          success: false,
          error: 'Token inválido o expirado para el dbName indicado',
          detail: e?.response?.data || String(e)
        });
      }
  
      // 4) Unificar params
      const params = { ...(req.body || {}), ...(req.query || {}) };
  
      // 5) Helpers seguros para el código de usuario
      const ctx = {
        params,
        dbName,
        token,
        tableName: TABLE_NAME,
        readData: (filters) => roble.readRecords(dbName, token, TABLE_NAME, filters),
        insertData: (records) => roble.insertRecords(dbName, token, TABLE_NAME, records),
        updateData: (recordId, updates) => roble.updateRecord(dbName, token, TABLE_NAME, '_id', recordId, updates),
        deleteData: (recordId) => roble.deleteRecord(dbName, token, TABLE_NAME, '_id', recordId),
        // También puedes exponer una consulta genérica si lo necesitas:
        // readTable: (table, filters) => roble.readRecords(dbName, token, table, filters),
      };
  
      // 6) Ejecutar el código del servicio en un scope controlado
      //    Tu código puede usar: const { params, readData, insertData, updateData, deleteData, dbName, token, tableName } = ctx;
      const userMain = async (ctx) => {
        const { params, readData } = ctx;
  
        // ======== Código por defecto si no se provee service.code ========
        // Lee y normaliza un poco los primeros registros para evidenciar transformación
        const rows = await readData();
        const normalized = Array.isArray(rows) ? rows.slice(0, 5).map(r => ({
          id: r._id ?? r.id ?? null,
          nombre: r.nombre ?? r.name ?? null,
          createdAt: r.created_at ?? r.createdAt ?? null
        })) : [];
  
        return {
          message: 'Roble microservice executed successfully',
          table: ctx.tableName,
          dbName: ctx.dbName,
          records_count: Array.isArray(rows) ? rows.length : 0,
          transformed_sample: normalized
        };
        // ================================================================
      };
  
      // 7) Si el generador trae código del usuario, lo insertamos dentro de userMain
      // (sustituimos el cuerpo por el recibido, manteniendo la firma y el scope con ctx)
      /* USER_CODE_START */
  ${(service.code || '')
    // indent each line by 6 spaces so it stays inside the template nicely
    .split('\n')
    .map(l => '      ' + l)
    .join('\n')}
      /* USER_CODE_END */
  
      // Si el bloque anterior define una función llamada userMain, úsala; si no, usamos la default
      let result;
      try {
        // Si el user code redefinió userMain, estará en este scope como variable
        // (Node evalúa plantilla ya con esta definición si existiera arriba)
        if (typeof userMain === 'function') {
          result = await userMain(ctx);
        } else {
          // fallback improbable: recreamos default
          result = await (async (ctx2) => {
            const { params, readData } = ctx2;
            const rows = await readData();
            return { message: 'ok', records_count: Array.isArray(rows) ? rows.length : 0 };
          })(ctx);
        }
      } catch (err) {
        return safeJson(res, 500, { success: false, error: 'Error en userMain', detail: String(err?.message || err) });
      }
  
      // 8) Respuesta final
      return safeJson(res, 200, {
        success: true,
        result,
        params
      });
  
    } catch (error) {
      const code = error?.response?.status || 500;
      return safeJson(res, code, {
        success: false,
        error: error?.message || 'Internal error',
        detail: error?.response?.data || undefined
      });
    }
  });
  
  const port = process.env.PORT || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(\`Roble Server running on port \${port}\`);
  });
  `;
  }
  