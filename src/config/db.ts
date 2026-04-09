import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI!, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Seed admin user if not exists
    await seedAdmin();
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ MongoDB connection error:', error.message);
    }
    process.exit(1);
  }
};

const seedAdmin = async (): Promise<void> => {
  try {
    const { default: User } = await import('../models/User.js');
    const bcrypt = await import('bcryptjs');

    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists && process.env.ADMIN_EMAIL) {
      const hashedPassword = await bcrypt.default.hash(process.env.ADMIN_PASSWORD || 'Admin@123456', 12);
      await User.create({
        name: 'Admin',
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
      });
      console.log('✅ Admin user seeded');
    }
  } catch (err) {
    if (err instanceof Error) {
      console.log('Admin seed skipped:', err.message);
    }
  }
};
