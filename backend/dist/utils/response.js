"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNoContent = exports.sendCreated = exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, data, message, statusCode = 200) => {
    const response = {
        success: true,
        data,
        message,
    };
    return res.status(statusCode).json(response);
};
exports.sendSuccess = sendSuccess;
const sendError = (res, error, statusCode = 400, data) => {
    const response = {
        success: false,
        error,
        data,
    };
    return res.status(statusCode).json(response);
};
exports.sendError = sendError;
const sendCreated = (res, data, message) => {
    return (0, exports.sendSuccess)(res, data, message, 201);
};
exports.sendCreated = sendCreated;
const sendNoContent = (res) => {
    return res.status(204).send();
};
exports.sendNoContent = sendNoContent;
//# sourceMappingURL=response.js.map