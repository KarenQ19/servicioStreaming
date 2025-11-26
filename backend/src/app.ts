import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from './config/passport';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Import routes
import routes from './routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:4173',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
}));


// Siempre permitir los dev servers comunes
['http://localhost:5173', 'http://localhost:4173'].forEach(origin => {
  if (!allowedOrigins.includes(origin)) {
    allowedOrigins.push(origin);
  }
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, origin || allowedOrigins[0]);
    }
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
}));

// Session configuration for Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Streaming Service API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
const apiPrefix = process.env.API_PREFIX || '/api/v1';
app.use(apiPrefix, routes);

// TODO: Uncomment when routes are created
// app.use(`${apiPrefix}/auth`, authRoutes);
// app.use(`${apiPrefix}/clients`, clientRoutes);
// app.use(`${apiPrefix}/admin`, adminRoutes);

// 404 handler
app.use(notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API base URL: http://localhost:${PORT}${apiPrefix}`);
});

export default app;
