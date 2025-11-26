import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to convert Prisma Cliente to Express.User
const clienteToExpressUser = (cliente: any): Express.User => ({
  id: cliente.id,
  email: cliente.email,
  nombre: cliente.nombre,
  role: 'CLIENTE',
  googleId: cliente.googleId || undefined,
  facebookId: cliente.facebookId || undefined,
  proveedor: cliente.proveedor as 'LOCAL' | 'GOOGLE' | 'FACEBOOK' | undefined,
  avatar: cliente.avatar || undefined
});

// Configuración de Google OAuth
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: "/api/v1/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Buscar usuario existente por Google ID
    let usuario = await prisma.cliente.findUnique({
      where: { googleId: profile.id }
    });

    if (usuario) {
      return done(null, clienteToExpressUser(usuario));
    }

    // Buscar usuario existente por email
    usuario = await prisma.cliente.findUnique({
      where: { email: profile.emails?.[0]?.value }
    });

    if (usuario) {
      // Vincular cuenta de Google al usuario existente
      usuario = await prisma.cliente.update({
        where: { id: usuario.id },
        data: {
          googleId: profile.id,
          proveedor: 'GOOGLE',
          avatar: profile.photos?.[0]?.value
        }
      });
      return done(null, clienteToExpressUser(usuario));
    }

    // Crear nuevo usuario
    usuario = await prisma.cliente.create({
      data: {
        googleId: profile.id,
        nombre: profile.displayName || profile.name?.givenName || 'Usuario',
        email: profile.emails?.[0]?.value || '',
        proveedor: 'GOOGLE',
        avatar: profile.photos?.[0]?.value,
        activo: true
      }
    });

    return done(null, clienteToExpressUser(usuario));
  } catch (error) {
    return done(error, null);
  }
}));

// Configuración de Facebook OAuth
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID!,
  clientSecret: process.env.FACEBOOK_APP_SECRET!,
  callbackURL: "/api/v1/auth/facebook/callback",
  profileFields: ['id', 'displayName', 'photos', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Buscar usuario existente por Facebook ID
    let usuario = await prisma.cliente.findUnique({
      where: { facebookId: profile.id }
    });

    if (usuario) {
      return done(null, usuario);
    }

    // Buscar usuario existente por email
    usuario = await prisma.cliente.findUnique({
      where: { email: profile.emails?.[0]?.value }
    });

    if (usuario) {
      // Vincular cuenta de Facebook al usuario existente
      usuario = await prisma.cliente.update({
        where: { id: usuario.id },
        data: {
          facebookId: profile.id,
          proveedor: 'FACEBOOK',
          avatar: profile.photos?.[0]?.value
        }
      });
      return done(null, usuario);
    }

    // Crear nuevo usuario
    usuario = await prisma.cliente.create({
      data: {
        facebookId: profile.id,
        nombre: profile.displayName || 'Usuario',
        email: profile.emails?.[0]?.value || '',
        proveedor: 'FACEBOOK',
        avatar: profile.photos?.[0]?.value,
        activo: true
      }
    });

    return done(null, usuario);
  } catch (error) {
    return done(error, null);
  }
}));

// Serialización del usuario
passport.serializeUser((user: Express.User, done) => {
  done(null, (user as any).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.cliente.findUnique({
      where: { id }
    });
    if (user) {
      const expressUser: Express.User = {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        role: 'CLIENTE', // Los clientes siempre tienen rol CLIENTE
        googleId: user.googleId || undefined,
        facebookId: user.facebookId || undefined,
        proveedor: user.proveedor as 'LOCAL' | 'GOOGLE' | 'FACEBOOK' | undefined,
        avatar: user.avatar || undefined
      };
      done(null, expressUser);
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error, null);
  }
});

export default passport;