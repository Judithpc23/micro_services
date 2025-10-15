#!/usr/bin/env node

/**
 * Script para configurar variables de entorno
 * Crea .env.local con variables de ejemplo
 */

const fs = require('fs');
const path = require('path');

const envContent = `# Configuración Roble - Variables Requeridas
ROBLE_BASE_HOST=https://roble-api.openlab.uninorte.edu.co
ROBLE_CONTRACT=test_contract_123
ROBLE_USER_EMAIL=test@ejemplo.com
ROBLE_USER_PASSWORD=test123456

# Variables Opcionales
SYNC_MICROSERVICES_TO_ROBLE=true
ROBLE_MODE=current
HTTP_TIMEOUT=5000
`;

const envPath = path.join(process.cwd(), '.env.local');

function setupEnvFile() {
    try {
        // Verificar si ya existe
        if (fs.existsSync(envPath)) {
            console.log('⚠️  El archivo .env.local ya existe');
            console.log('📄 Contenido actual:');
            console.log(fs.readFileSync(envPath, 'utf8'));
            console.log('\n💡 Si necesitas actualizarlo, edita el archivo manualmente');
            return;
        }

        // Crear el archivo
        fs.writeFileSync(envPath, envContent, 'utf8');
        
        // Establecer permisos restrictivos (solo en sistemas Unix)
        if (process.platform !== 'win32') {
            fs.chmodSync(envPath, 0o600);
        }

        console.log('✅ Archivo .env.local creado exitosamente');
        console.log('📄 Ubicación:', envPath);
        console.log('\n📋 Variables configuradas:');
        console.log('   - ROBLE_BASE_HOST: https://roble-api.openlab.uninorte.edu.co');
        console.log('   - ROBLE_CONTRACT: test_contract_123');
        console.log('   - ROBLE_USER_EMAIL: test@ejemplo.com');
        console.log('   - ROBLE_USER_PASSWORD: test123456');
        console.log('   - SYNC_MICROSERVICES_TO_ROBLE: true');
        
        console.log('\n⚠️  IMPORTANTE:');
        console.log('   1. Actualiza las credenciales con tus valores reales');
        console.log('   2. No compartas este archivo (contiene credenciales)');
        console.log('   3. Asegúrate de que esté en .gitignore');
        
        console.log('\n🚀 Próximos pasos:');
        console.log('   1. Edita .env.local con tus credenciales reales');
        console.log('   2. Reinicia los servicios: docker-compose down && docker-compose up --build');

    } catch (error) {
        console.error('❌ Error creando .env.local:', error.message);
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    setupEnvFile();
}

module.exports = { setupEnvFile };
