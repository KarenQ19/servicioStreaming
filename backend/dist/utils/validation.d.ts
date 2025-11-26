import Joi from 'joi';
export declare const loginSchema: Joi.ObjectSchema<any>;
export declare const registerSchema: Joi.ObjectSchema<any>;
export declare const updateProfileSchema: Joi.ObjectSchema<any>;
export declare const createServiceSchema: Joi.ObjectSchema<any>;
export declare const updateServiceSchema: Joi.ObjectSchema<any>;
export declare const addToCartSchema: Joi.ObjectSchema<any>;
export declare const processPaymentSchema: Joi.ObjectSchema<any>;
export declare const validate: (schema: Joi.ObjectSchema) => (req: any, res: any, next: any) => any;
//# sourceMappingURL=validation.d.ts.map