const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Usuarios de prueba (simulando base de datos)
const usuarios = [
  {
    id: 1,
    email: 'admin@gmail.com',
    password: '$2b$10$fGaKJ1am/mqbWuybf0oJz.SFhq2pEgY.WO5LxFYZENHh0Q9zAGJIG', // admin123
    nombre: 'Administrador',
    role: 'ADMINISTRADOR'
  },
  {
    id: 2,
    email: 'cliente@test.com',
    password: '$2b$10$lDMQywboijVqH6ddsPibbOjA1ZL37Hsg3eWkbl9EWlL3LN/W5ly3m', // cliente123
    nombre: 'Cliente Test',
    role: 'CLIENTE'
  }
];

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Función de login común
const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt:', { email, password });
    
    // Buscar usuario
    const usuario = usuarios.find(u => u.email === email);
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Generar token
    const token = jwt.sign(
      { 
        id: usuario.id, 
        email: usuario.email, 
        role: usuario.role 
      },
      'secret-key',
      { expiresIn: '24h' }
    );
    
    // Respuesta en el formato esperado por el frontend
    res.json({
      data: {
        token,
        usuario: {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          role: usuario.role
        }
      }
    });
    
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Rutas de login (ambas usan la misma función)
app.post('/api/v1/auth/login', handleLogin);
app.post('/api/v1/auth/admin/login', handleLogin);

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  
  jwt.verify(token, 'secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Ruta de perfil (verificación de token)
app.get('/api/v1/auth/profile', authenticateToken, (req, res) => {
  const usuario = usuarios.find(u => u.id === req.user.id);
  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  
  res.json({
    data: {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      role: usuario.role
    }
  });
});

// Ruta protegida de prueba (mantener para compatibilidad)
app.get('/api/v1/auth/me', authenticateToken, (req, res) => {
  const usuario = usuarios.find(u => u.id === req.user.id);
  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  
  res.json({
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    role: usuario.role
  });
});

// Rutas de admin (simuladas)
app.get('/api/v1/admin/dashboard', authenticateToken, (req, res) => {
  if (req.user.role !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  
  res.json({
    totalClientes: 150,
    clientesActivos: 120,
    ventasHoy: 25,
    ventasMes: 450,
    serviciosActivos: 12,
    carritosActivos: 35
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: development`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api/v1`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});