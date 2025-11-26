import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate, loginSchema, registerSchema } from '../utils/validation';
import passport from '../config/passport';
import jwt from 'jsonwebtoken';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.loginClient);
router.post('/admin/login', validate(loginSchema), AuthController.loginAdmin);

// Social authentication routes
// Ruta para iniciar autenticación con Google
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Callback de Google
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
  (req, res) => {
    const user = req.user as any;
    
    // Generar JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        nombre: user.nombre,
        proveedor: user.proveedor 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Redirigir al frontend con el token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// Ruta para iniciar autenticación con Facebook
router.get('/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

// Callback de Facebook
router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login?error=facebook_auth_failed' }),
  (req, res) => {
    const user = req.user as any;
    
    // Generar JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        nombre: user.nombre,
        proveedor: user.proveedor 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Redirigir al frontend con el token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// Protected routes
router.post('/logout', authenticate, AuthController.logout);
router.get('/profile', authenticate, AuthController.getProfile);
router.get('/verify', authenticate, AuthController.verifyToken);

export default router;