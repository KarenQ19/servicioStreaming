"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    console.error('Error:', err);
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal Server Error';
    if (err.name === 'PrismaClientKnownRequestError') {
        statusCode = 400;
        message = 'Database operation failed';
    }
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
    }
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }
    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map