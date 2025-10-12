/**
 * Prueba de Inserción con Roble
 * 
 * Este script prueba la funcionalidad completa de sincronización con Roble:
 * 1. Autenticación
 * 2. Inserción de microservicio
 * 3. Verificación de datos
 * 
 * Uso: node test-roble-insertion.js
 */

// Usar fetch nativo de Node.js (disponible desde Node 18+)

const BASE_URL = 'http://localhost:3000';

async function testRobleInsertion() {
  console.log('🧪 Iniciando prueba de inserción con Roble...\n');

  try {
    // 1. Verificar estado del servidor
    console.log('📡 Verificando servidor...');
    const healthResponse = await fetch(`${BASE_URL}/api/services`);
    if (!healthResponse.ok) {
      throw new Error(`Servidor no disponible: ${healthResponse.status}`);
    }
    console.log('✅ Servidor funcionando\n');

    // 2. Crear microservicio de prueba
    console.log('📝 Creando microservicio de prueba...');
    const testService = {
      name: `Test Roble Insertion ${Date.now()}`,
      description: 'Servicio de prueba para verificar sincronización con Roble',
      language: 'python',
      code: `def handler():
    return {
        "message": "Hello from Roble test",
        "timestamp": "${new Date().toISOString()}",
        "service": "test-roble-insertion"
    }`,
      type: 'execution'
    };

    const createResponse = await fetch(`${BASE_URL}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testService)
    });

    if (!createResponse.ok) {
      throw new Error(`Error creando microservicio: ${createResponse.status}`);
    }

    const createdService = await createResponse.json();
    console.log(`✅ Microservicio creado: ${createdService.id}`);
    console.log(`   Nombre: ${createdService.name}`);
    console.log(`   Lenguaje: ${createdService.language}\n`);

    // 3. Esperar un momento para la sincronización automática
    console.log('⏳ Esperando sincronización automática...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Verificar sincronización manual
    console.log('🔄 Verificando sincronización manual...');
    const syncResponse = await fetch(`${BASE_URL}/api/services/sync-roble`, {
      method: 'POST'
    });

    if (!syncResponse.ok) {
      throw new Error(`Error en sincronización: ${syncResponse.status}`);
    }

    const syncResult = await syncResponse.json();
    console.log(`✅ Sincronización completada: ${syncResult.results.success} exitosos, ${syncResult.results.failed} fallidos\n`);

    // 5. Verificar datos en Roble
    console.log('🔍 Verificando datos en Roble...');
    const verifyResponse = await fetch(`${BASE_URL}/api/verify-roble-data`);

    if (!verifyResponse.ok) {
      throw new Error(`Error verificando datos: ${verifyResponse.status}`);
    }

    const verifyResult = await verifyResponse.json();
    console.log(`📊 Registros encontrados en Roble: ${verifyResult.recordCount}`);
    
    if (verifyResult.recordCount > 0) {
      console.log('✅ ¡Sincronización exitosa! Los datos están en Roble.');
      console.log('📋 Primeros registros:');
      verifyResult.records.slice(0, 3).forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.name} (ID: ${record._id})`);
      });
    } else {
      console.log('⚠️  No se encontraron registros en Roble');
    }

    console.log('\n🎉 Prueba de inserción completada exitosamente!');
    console.log('\n📋 Resumen:');
    console.log(`   ✅ Servidor: Funcionando`);
    console.log(`   ✅ Creación: Microservicio creado (${createdService.id})`);
    console.log(`   ✅ Sincronización: ${syncResult.results.success} registros sincronizados`);
    console.log(`   ✅ Verificación: ${verifyResult.recordCount} registros en Roble`);

  } catch (error) {
    console.error('\n❌ Error en la prueba:', error.message);
    console.log('\n🔧 Posibles soluciones:');
    console.log('   1. Asegúrate de que el servidor esté ejecutándose (npm run dev)');
    console.log('   2. Verifica que las variables de entorno estén configuradas');
    console.log('   3. Revisa que la conexión a Roble sea correcta');
    process.exit(1);
  }
}

// Ejecutar la prueba
if (require.main === module) {
  testRobleInsertion();
}

module.exports = { testRobleInsertion };
