// Template para configuración segura de variables de entorno (JavaScript)
// Este archivo se puede usar como base para generar configuraciones

class RobleConfig {
    constructor() {
        this.baseUrl = process.env.ROBLE_BASE_HOST;
        this.contract = process.env.ROBLE_CONTRACT;
        this.tableName = process.env.TABLE_NAME;
        this.userEmail = process.env.ROBLE_USER_EMAIL;
        this.userPassword = process.env.ROBLE_USER_PASSWORD;
        this.token = process.env.ROBLE_TOKEN;
        this.mode = process.env.ROBLE_MODE || 'current';
        
        this.validate();
    }
    
    validate() {
        const required = {
            'baseUrl': this.baseUrl,
            'contract': this.contract,
            'tableName': this.tableName
        };
        
        const missing = Object.entries(required)
            .filter(([key, value]) => !value)
            .map(([key]) => key);
            
        if (missing.length > 0) {
            throw new Error(`Variables de entorno requeridas faltantes: ${missing.join(', ')}`);
        }
        
        // Validar autenticación
        if (this.mode === 'current') {
            if (!this.userEmail || !this.userPassword) {
                throw new Error("ROBLE_USER_EMAIL y ROBLE_USER_PASSWORD son requeridos en modo 'current'");
            }
        } else {
            if (!this.token && !(this.userEmail && this.userPassword)) {
                throw new Error("ROBLE_TOKEN o credenciales son requeridos en modo 'different'");
            }
        }
    }
    
    toObject() {
        return {
            baseUrl: this.baseUrl,
            contract: this.contract,
            tableName: this.tableName,
            mode: this.mode,
            hasCredentials: !!(this.userEmail && this.userPassword),
            hasToken: !!this.token
        };
    }
}

// Función helper para cargar configuración
function loadRobleConfig() {
    try {
        return new RobleConfig();
    } catch (error) {
        console.error(`❌ Error de configuración: ${error.message}`);
        console.log("💡 Asegúrate de tener las siguientes variables en .env:");
        console.log("   - ROBLE_BASE_HOST");
        console.log("   - ROBLE_CONTRACT");
        console.log("   - TABLE_NAME");
        console.log("   - ROBLE_USER_EMAIL (modo current)");
        console.log("   - ROBLE_USER_PASSWORD (modo current)");
        throw error;
    }
}

// Uso en el servicio
if (require.main === module) {
    try {
        const config = loadRobleConfig();
        console.log(`✅ Configuración cargada:`, config.toObject());
    } catch (error) {
        process.exit(1);
    }
}

module.exports = { RobleConfig, loadRobleConfig };
