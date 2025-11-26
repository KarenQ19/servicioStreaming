import Joi from 'joi';

// Auth validation schemas
export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required',
  }),
});

export const registerSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name must not exceed 100 characters',
    'any.required': 'Name is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'any.required': 'Password is required',
  }),
  telefono: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().messages({
    'string.pattern.base': 'Phone number must be a valid international format',
  }),
});

// Profile validation schemas
export const updateProfileSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).optional(),
  telefono: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).max(128).optional().messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.max': 'Password must not exceed 128 characters',
  }),
});

// Service validation schemas
export const createServiceSchema = Joi.object({
  nombre: Joi.string().min(2).max(200).required(),
  descripcion: Joi.string().min(10).max(1000).required(),
  precio: Joi.number().positive().required(),
  categoria: Joi.string().min(2).max(100).required(),
  disponible: Joi.boolean().optional().default(true),
  caracteristicas: Joi.array().items(Joi.string()).optional(),
});

export const updateServiceSchema = Joi.object({
  nombre: Joi.string().min(2).max(200).optional(),
  descripcion: Joi.string().min(10).max(1000).optional(),
  precio: Joi.number().positive().optional(),
  categoria: Joi.string().min(2).max(100).optional(),
  disponible: Joi.boolean().optional(),
  caracteristicas: Joi.array().items(Joi.string()).optional(),
});

// Cart validation schemas
export const addToCartSchema = Joi.object({
  servicioId: Joi.string().uuid().required(),
  cantidad: Joi.number().integer().min(1).optional().default(1),
});

// Payment validation schemas
export const processPaymentSchema = Joi.object({
  carritoId: Joi.string().uuid().required(),
  metodoPagoId: Joi.string().uuid().required(),
  total: Joi.number().positive().required(),
});

// Validation middleware
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
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