import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import salesRoutes from './routes/sales.js';
import syncRoutes from './routes/sync.js';
import userRoutes from './routes/users.js';
import reportRoutes from './routes/reports.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  try {
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️ MONGODB_URI not set. Running without database.');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log('✅ Connected to MongoDB');
    
    // Seed default admin if no users exist
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('No users found in DB. Creating default admin...');
      const hashedPassword = await bcrypt.hash('Admin@BuildPOS!', 10);
      await User.create({
        _id: 'default-admin',
        username: 'admin',
        password: hashedPassword,
        name: 'Administrator',
        role: 'admin'
      });
      console.log('✅ Default admin created (admin / Admin@BuildPOS!)');
    }
  } catch (err) {
    console.warn('⚠️  MongoDB not connected (running without database):', err.message);
  }
}

// Serverless DB Connection Middleware
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;

// Only listen locally (Vercel Serverless handles routing directly)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 BuildPOS API running on http://localhost:${PORT}`);
    });
  });
}
