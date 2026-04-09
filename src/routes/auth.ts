import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { IAuthenticatedRequest } from '../types/auth.js';
import mongoose from 'mongoose';

const router = Router();

const generateToken = (id: string): string =>
  jwt.sign(
  { userId: 1 },       // payload
   process.env.JWT_SECRET  || 'secret',              // secret
  { expiresIn: "7d" } // options
);
// POST /api/auth/register
router.post('/register', async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, phone, isVerified: true });
    const token = generateToken(user._id.toString());

    res.status(201).json({ success: true, message: 'Account created successfully', token, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// POST /api/auth/login
router.post('/login', async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact support.' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id.toString());
    res.json({ success: true, token, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const user = await User.findById(req.user?._id).populate('savedProperties', 'title price location status');
    res.json({ success: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      { name, phone, avatar },
      { new: true, runValidators: true }
    );
    res.json({ success: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user?._id).select('+password');

    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    const token = generateToken(user._id.toString());
    res.json({ success: true, message: 'Password updated', token });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// POST /api/auth/save-property
router.post('/save-property/:landId', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const alreadySaved = user.savedProperties.some((id) => id.toString() === req.params.landId);

    if (alreadySaved) {
      user.savedProperties = user.savedProperties.filter((id) => id.toString() !== req.params.landId);
    } else {
     user.savedProperties.push(new mongoose.Types.ObjectId(req.params.landId));
    }
    await user.save();

    res.json({ success: true, saved: !alreadySaved, savedProperties: user.savedProperties });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

export default router;
