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

// Connect to MongoDB and start server
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Seed default admin if no users exist
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('No users found in DB. Creating default admin...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        _id: 'default-admin',
        username: 'admin',
        password: hashedPassword,
        name: 'Administrator',
        role: 'admin'
      });
      console.log('✅ Default admin created (admin / admin123)');
    }
  } catch (err) {
    console.warn('⚠️  MongoDB not connected (running without database):', err.message);
    console.warn('   The frontend will work offline using IndexedDB');
  }

  app.listen(PORT, () => {
    console.log(`🚀 BuildPOS API running on http://localhost:${PORT}`);
  });
}

start();
