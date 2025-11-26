"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_facebook_1 = require("passport-facebook");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const clienteToExpressUser = (cliente) => ({
    id: cliente.id,
    email: cliente.email,
    nombre: cliente.nombre,
    role: 'CLIENTE',
    googleId: cliente.googleId || undefined,
    facebookId: cliente.facebookId || undefined,
    proveedor: cliente.proveedor,
    avatar: cliente.avatar || undefined
});
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/v1/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let usuario = await prisma.cliente.findUnique({
            where: { googleId: profile.id }
        });
        if (usuario) {
            return done(null, clienteToExpressUser(usuario));
        }
        usuario = await prisma.cliente.findUnique({
            where: { email: profile.emails?.[0]?.value }
        });
        if (usuario) {
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
    }
    catch (error) {
        return done(error, null);
    }
}));
passport_1.default.use(new passport_facebook_1.Strategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/api/v1/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'photos', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let usuario = await prisma.cliente.findUnique({
            where: { facebookId: profile.id }
        });
        if (usuario) {
            return done(null, usuario);
        }
        usuario = await prisma.cliente.findUnique({
            where: { email: profile.emails?.[0]?.value }
        });
        if (usuario) {
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
    }
    catch (error) {
        return done(error, null);
    }
}));
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await prisma.cliente.findUnique({
            where: { id }
        });
        if (user) {
            const expressUser = {
                id: user.id,
                email: user.email,
                nombre: user.nombre,
                role: 'CLIENTE',
                googleId: user.googleId || undefined,
                facebookId: user.facebookId || undefined,
                proveedor: user.proveedor,
                avatar: user.avatar || undefined
            };
            done(null, expressUser);
        }
        else {
            done(null, false);
        }
    }
    catch (error) {
        done(error, null);
    }
});
exports.default = passport_1.default;
//# sourceMappingURL=passport.js.map