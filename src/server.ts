import express, { Request, Response, NextFunction, Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import cookieParser from "cookie-parser";


// Route imports
import authRoutes from './routes/auth.js';
import landRoutes from './routes/land.routes.js';
import aiRoutes from './routes/ai.js';
import adminRoutes from './routes/admin.js';
import reportRoutes from './routes/reports.js';
import inquiryRoutes from './routes/inquiries.js';
import paymentRoutes from './models/payment/payment.controler.js';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

app.use(cookieParser());

// Connect to MongoDB
await connectDB();

// Security middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: [process.env.FRONTEND_URL || 'http://localhost:3000' || 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// AI rate limit (stricter)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, message: 'AI analysis rate limit exceeded. Please wait.' },
});
app.use('/api/ai/', aiLimiter);


// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));


// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'LandIQ API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/land', landRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/payment', paymentRoutes);


// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});


// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Eland Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
});

export default app;
