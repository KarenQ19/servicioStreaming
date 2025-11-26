"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.processPaymentSchema = exports.addToCartSchema = exports.updateServiceSchema = exports.createServiceSchema = exports.updateProfileSchema = exports.registerSchema = exports.loginSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required().messages({
        'string.email': 'Email must be a valid email address',
        'any.required': 'Email is required',
    }),
    password: joi_1.default.string().min(6).required().messages({
        'string.min': 'Password must be at least 6 characters long',
        'any.required': 'Password is required',
    }),
});
exports.registerSchema = joi_1.default.object({
    nombre: joi_1.default.string().min(2).max(100).required().messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name must not exceed 100 characters',
        'any.required': 'Name is required',
    }),
    email: joi_1.default.string().email().required().messages({
        'string.email': 'Email must be a valid email address',
        'any.required': 'Email is required',
    }),
    password: joi_1.default.string().min(6).max(128).required().messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password must not exceed 128 characters',
        'any.required': 'Password is required',
    }),
    telefono: joi_1.default.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().messages({
        'string.pattern.base': 'Phone number must be a valid international format',
    }),
});
exports.updateProfileSchema = joi_1.default.object({
    nombre: joi_1.default.string().min(2).max(100).optional(),
    telefono: joi_1.default.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    email: joi_1.default.string().email().optional(),
    password: joi_1.default.string().min(6).max(128).optional().messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password must not exceed 128 characters',
    }),
});
exports.createServiceSchema = joi_1.default.object({
    nombre: joi_1.default.string().min(2).max(200).required(),
    descripcion: joi_1.default.string().min(10).max(1000).required(),
    precio: joi_1.default.number().positive().required(),
    categoria: joi_1.default.string().min(2).max(100).required(),
    disponible: joi_1.default.boolean().optional().default(true),
    caracteristicas: joi_1.default.array().items(joi_1.default.string()).optional(),
});
exports.updateServiceSchema = joi_1.default.object({
    nombre: joi_1.default.string().min(2).max(200).optional(),
    descripcion: joi_1.default.string().min(10).max(1000).optional(),
    precio: joi_1.default.number().positive().optional(),
    categoria: joi_1.default.string().min(2).max(100).optional(),
    disponible: joi_1.default.boolean().optional(),
    caracteristicas: joi_1.default.array().items(joi_1.default.string()).optional(),
});
exports.addToCartSchema = joi_1.default.object({
    servicioId: joi_1.default.string().uuid().required(),
    cantidad: joi_1.default.number().integer().min(1).optional().default(1),
});
exports.processPaymentSchema = joi_1.default.object({
    carritoId: joi_1.default.string().uuid().required(),
    metodoPagoId: joi_1.default.string().uuid().required(),
    total: joi_1.default.number().positive().required(),
});
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message,
            });
        }
        next();
    };
};
exports.validate = validate;
//# sourceMappingURL=validation.js.map