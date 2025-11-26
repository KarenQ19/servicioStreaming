"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const database_1 = require("./utils/database");
const PORT = process.env.PORT || 3000;
const gracefulShutdown = async () => {
    console.log('🔄 Shutting down gracefully...');
    try {
        await database_1.prisma.$disconnect();
        console.log('📦 Database connection closed');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
app_1.default.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}${process.env.API_PREFIX || '/api/v1'}`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
//# sourceMappingURL=server.js.map