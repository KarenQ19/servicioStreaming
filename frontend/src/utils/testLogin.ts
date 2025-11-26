// Utilidad para hacer login automático con credenciales de prueba
export const testLogin = async () => {
  const credentials = {
    email: 'cliente@test.com',
    password: 'password123'
  };

  try {
    const response = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('token', data.data.token);
      console.log('✅ Login exitoso:', data.data.user);
      window.location.reload();
    } else {
      console.error('❌ Error en login:', data.message);
    }
  } catch (error) {
    console.error('❌ Error de red:', error);
  }
};

// Hacer disponible globalmente para testing
(window as typeof window & { testLogin: typeof testLogin }).testLogin = testLogin;