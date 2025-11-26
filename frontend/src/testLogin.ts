// Script para hacer login automático con credenciales de prueba
export async function testLogin(): Promise<void> {
  try {
    console.log('🔐 Iniciando login de prueba...');
    
    const response = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'cliente@test.com',
        password: 'cliente123'
      })
    });

    const data = await response.json();
    
    if (data.success && data.data.token) {
      // Guardar token en localStorage
      localStorage.setItem('token', data.data.token);
      console.log('✅ Login exitoso! Token guardado:', data.data.token.substring(0, 20) + '...');
      console.log('👤 Usuario:', data.data.user);
      
      // Recargar la página para que se actualice el estado de autenticación
      window.location.reload();
    } else {
      console.error('❌ Error en login:', data);
    }
  } catch (error) {
    console.error('❌ Error de red:', error);
  }
}

// Hacer la función disponible globalmente para usar en la consola
declare global {
  interface Window {
    testLogin: () => Promise<void>;
  }
}

(window as Window).testLogin = testLogin;