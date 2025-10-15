# Template para configuración segura de variables de entorno
# Este archivo se puede usar como base para generar configuraciones

import os
from typing import Optional, Dict, Any
from dataclasses import dataclass

@dataclass
class RobleConfig:
    """Configuración centralizada para servicios Roble"""
    base_url: str
    contract: str
    table_name: str
    user_email: Optional[str] = None
    user_password: Optional[str] = None
    token: Optional[str] = None
    mode: str = 'current'
    
    @classmethod
    def from_env(cls) -> 'RobleConfig':
        """Crear configuración desde variables de entorno"""
        config = cls(
            base_url=os.getenv('ROBLE_BASE_HOST'),
            contract=os.getenv('ROBLE_CONTRACT'),
            table_name=os.getenv('TABLE_NAME'),
            user_email=os.getenv('ROBLE_USER_EMAIL'),
            user_password=os.getenv('ROBLE_USER_PASSWORD'),
            token=os.getenv('ROBLE_TOKEN'),
            mode=os.getenv('ROBLE_MODE', 'current')
        )
        
        # Validar configuración requerida
        config.validate()
        return config
    
    def validate(self):
        """Validar que las variables requeridas estén presentes"""
        required = {
            'base_url': self.base_url,
            'contract': self.contract,
            'table_name': self.table_name
        }
        
        missing = [key for key, value in required.items() if not value]
        if missing:
            raise ValueError(f"Variables de entorno requeridas faltantes: {missing}")
        
        # Validar autenticación
        if self.mode == 'current':
            if not self.user_email or not self.user_password:
                raise ValueError("ROBLE_USER_EMAIL y ROBLE_USER_PASSWORD son requeridos en modo 'current'")
        else:
            if not self.token and not (self.user_email and self.user_password):
                raise ValueError("ROBLE_TOKEN o credenciales son requeridos en modo 'different'")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertir a diccionario (sin credenciales sensibles)"""
        return {
            'base_url': self.base_url,
            'contract': self.contract,
            'table_name': self.table_name,
            'mode': self.mode,
            'has_credentials': bool(self.user_email and self.user_password),
            'has_token': bool(self.token)
        }

# Función helper para cargar configuración
def load_roble_config() -> RobleConfig:
    """Cargar configuración Roble con validación automática"""
    try:
        return RobleConfig.from_env()
    except ValueError as e:
        print(f"❌ Error de configuración: {e}")
        print("💡 Asegúrate de tener las siguientes variables en .env.local:")
        print("   - ROBLE_BASE_HOST")
        print("   - ROBLE_CONTRACT") 
        print("   - TABLE_NAME")
        print("   - ROBLE_USER_EMAIL (modo current)")
        print("   - ROBLE_USER_PASSWORD (modo current)")
        raise

# Uso en el servicio
if __name__ == "__main__":
    try:
        config = load_roble_config()
        print(f"✅ Configuración cargada: {config.to_dict()}")
    except ValueError:
        exit(1)
