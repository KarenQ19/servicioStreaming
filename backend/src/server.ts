import app from './app';
import { prisma } from './utils/database';

const PORT = process.env.PORT || 3000;

// Graceful shutdown function
const gracefulShutdown = async () => {
  console.log('🔄 Shutting down gracefully...');
  
  try {
    await prisma.$disconnect();
    console.log('📦 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}${process.env.API_PREFIX || '/api/v1'}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});