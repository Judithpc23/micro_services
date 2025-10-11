/**
 * Test completo de integración con Roble
 * Incluye: autenticación, inserción, lectura, actualización y eliminación de microservicios
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Cargar variables de entorno desde .env en la raíz del proyecto
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env');
console.log('🔍 Buscando archivo .env en:', envPath);
dotenv.config({ path: envPath });

// Mostrar las variables cargadas
console.log('🔧 Variables cargadas desde .env:')
console.log('ROBLE_BASE_HOST:', process.env.ROBLE_BASE_HOST)
console.log('ROBLE_CONTRACT:', process.env.ROBLE_CONTRACT)

class RobleTestSuite {
  constructor() {
    this.baseUrl = process.env.ROBLE_BASE_HOST;
    this.contract = process.env.ROBLE_CONTRACT;
    this.authUrl = `${this.baseUrl}/auth/${this.contract}`;
    this.dbUrl = `${this.baseUrl}/database/${this.contract}`;
    this.accessToken = null;
  }

  async authenticate() {
    console.log('\n🔐 === AUTENTICACIÓN ===');
    console.log('Login URL:', `${this.authUrl}/login`);
    
    try {
      const response = await fetch(`${this.authUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Password123!'
        })
      });
      
      console.log('Login Status:', response.status);
      const data = await response.text();
      console.log('Login Response:', data.substring(0, 200) + '...');
      
      if (response.ok) {
        const loginData = JSON.parse(data);
        this.accessToken = loginData.accessToken;
        console.log('✅ Autenticación exitosa');
        console.log('Access Token:', this.accessToken.substring(0, 20) + '...');
        return true;
      } else {
        console.log('❌ Error en autenticación:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Error de red:', error.message);
      return false;
    }
  }

  async testInsertMicroservice() {
    console.log('\n📝 === INSERCIÓN DE MICROSERVICIO ===');
    
    const microserviceData = {
      id: 'ms_' + Date.now(),
      name: 'Microservicio de Test',
      description: 'Microservicio creado desde test completo',
      language: 'python',
      code: 'def handler():\n    return {"message": "Hello from test microservice!"}',
      type: 'test',
      status: 'running',
      createAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      endpoint: 'http://localhost:3000/ms_' + Date.now()
    };
    
    console.log('Datos a insertar:', microserviceData);
    
    try {
      const response = await fetch(`${this.dbUrl}/insert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tableName: 'microservices',
          records: [microserviceData]
        })
      });
      
      console.log('Insert Status:', response.status);
      const data = await response.text();
      console.log('Insert Response:', data);
      
      if (response.ok) {
        const insertData = JSON.parse(data);
        console.log('✅ Microservicio insertado exitosamente!');
        console.log('Registros insertados:', insertData.inserted?.length || 0);
        if (insertData.skipped && insertData.skipped.length > 0) {
          console.log('Registros omitidos:', insertData.skipped.length);
        }
        return insertData.inserted?.[0] || null;
      } else {
        console.log('❌ Error al insertar:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Error de red:', error.message);
      return null;
    }
  }

  async testReadMicroservices() {
    console.log('\n📖 === LECTURA DE MICROSERVICIOS ===');
    
    try {
      const response = await fetch(`${this.dbUrl}/read?tableName=microservices`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Read Status:', response.status);
      const data = await response.text();
      console.log('Read Response:', data.substring(0, 500) + '...');
      
      if (response.ok) {
        const readData = JSON.parse(data);
        console.log('✅ Microservicios leídos exitosamente!');
        console.log('Total de microservicios:', readData.length);
        return readData;
      } else {
        console.log('❌ Error al leer:', response.status);
        return [];
      }
    } catch (error) {
      console.error('❌ Error de red:', error.message);
      return [];
    }
  }

  async testUpdateMicroservice(microserviceId) {
    console.log('\n✏️ === ACTUALIZACIÓN DE MICROSERVICIO ===');
    
    if (!microserviceId) {
      console.log('❌ No hay microservicio para actualizar');
      return false;
    }
    
    try {
      const response = await fetch(`${this.dbUrl}/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tableName: 'microservices',
          idColumn: 'id',
          idValue: microserviceId,
          updates: {
            status: 'updated',
            updatedAt: new Date().toISOString()
          }
        })
      });
      
      console.log('Update Status:', response.status);
      const data = await response.text();
      console.log('Update Response:', data);
      
      if (response.ok) {
        console.log('✅ Microservicio actualizado exitosamente!');
        return true;
      } else {
        console.log('❌ Error al actualizar:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Error de red:', error.message);
      return false;
    }
  }

  async testDeleteMicroservice(microserviceId) {
    console.log('\n🗑️ === ELIMINACIÓN DE MICROSERVICIO ===');
    
    if (!microserviceId) {
      console.log('❌ No hay microservicio para eliminar');
      return false;
    }
    
    try {
      const response = await fetch(`${this.dbUrl}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tableName: 'microservices',
          idColumn: 'id',
          idValue: microserviceId
        })
      });
      
      console.log('Delete Status:', response.status);
      const data = await response.text();
      console.log('Delete Response:', data);
      
      if (response.ok) {
        console.log('✅ Microservicio eliminado exitosamente!');
        return true;
      } else {
        console.log('❌ Error al eliminar:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Error de red:', error.message);
      return false;
    }
  }

  async testTokenVerification() {
    console.log('\n🔍 === VERIFICACIÓN DE TOKEN ===');
    
    try {
      const response = await fetch(`${this.authUrl}/verify-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Verify Token Status:', response.status);
      const data = await response.text();
      console.log('Verify Token Response:', data);
      
      if (response.ok) {
        console.log('✅ Token verificado exitosamente!');
        return true;
      } else {
        console.log('❌ Error al verificar token:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Error de red:', error.message);
      return false;
    }
  }

  async runCompleteTest() {
    console.log('🧪 === INICIANDO TEST COMPLETO DE ROBLE ===');
    console.log('Base URL:', this.baseUrl);
    console.log('Contract:', this.contract);
    
    let results = {
      authentication: false,
      insert: false,
      read: false,
      update: false,
      delete: false,
      tokenVerification: false
    };
    
    let insertedMicroservice = null;
    
    try {
      // 1. Autenticación
      results.authentication = await this.authenticate();
      if (!results.authentication) {
        console.log('❌ No se puede continuar sin autenticación');
        return results;
      }
      
      // 2. Verificación de token
      results.tokenVerification = await this.testTokenVerification();
      
      // 3. Inserción
      insertedMicroservice = await this.testInsertMicroservice();
      results.insert = !!insertedMicroservice;
      
      // 4. Lectura
      const microservices = await this.testReadMicroservices();
      results.read = microservices.length > 0;
      
      // 5. Actualización (solo si se insertó correctamente)
      if (insertedMicroservice && insertedMicroservice.id) {
        results.update = await this.testUpdateMicroservice(insertedMicroservice.id);
      }
      
      // 6. Eliminación (solo si se insertó correctamente)
      if (insertedMicroservice && insertedMicroservice.id) {
        results.delete = await this.testDeleteMicroservice(insertedMicroservice.id);
      }
      
      // 7. Lectura final para verificar eliminación
      console.log('\n📖 === LECTURA FINAL ===');
      const finalMicroservices = await this.testReadMicroservices();
      console.log('Total de microservicios después de eliminación:', finalMicroservices.length);
      
    } catch (error) {
      console.error('❌ Error general en el test:', error.message);
    }
    
    // Resumen de resultados
    console.log('\n📊 === RESUMEN DE RESULTADOS ===');
    console.log('✅ Autenticación:', results.authentication ? 'ÉXITO' : 'FALLO');
    console.log('✅ Verificación de token:', results.tokenVerification ? 'ÉXITO' : 'FALLO');
    console.log('✅ Inserción:', results.insert ? 'ÉXITO' : 'FALLO');
    console.log('✅ Lectura:', results.read ? 'ÉXITO' : 'FALLO');
    console.log('✅ Actualización:', results.update ? 'ÉXITO' : 'FALLO');
    console.log('✅ Eliminación:', results.delete ? 'ÉXITO' : 'FALLO');
    
    const successCount = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 RESULTADO FINAL: ${successCount}/${totalTests} tests exitosos`);
    
    if (successCount === totalTests) {
      console.log('🎉 ¡TODOS LOS TESTS PASARON! La integración con Roble está funcionando perfectamente.');
    } else {
      console.log('⚠️ Algunos tests fallaron. Revisar la configuración y permisos.');
    }
    
    return results;
  }
}

// Ejecutar test completo
const testSuite = new RobleTestSuite();
testSuite.runCompleteTest().then(() => {
  console.log('\n🎉 Test completo finalizado');
}).catch(console.error);
