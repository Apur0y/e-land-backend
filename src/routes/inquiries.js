import express from 'express';
import Inquiry from '../models/Inquiry.js';
import Land from '../models/Land.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/inquiries - Submit inquiry
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { landId, name, email, phone, message, type, budget } = req.body;
    
    if (!landId || !name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }
    
    const land = await Land.findById(landId);
    if (!land) return res.status(404).json({ success: false, message: 'Land not found' });
    
    const inquiry = await Inquiry.create({
      land: landId, name, email, phone, message, type, budget,
      user: req.user?._id,
    });
    
    await Land.findByIdAndUpdate(landId, { $inc: { inquiries: 1 } });
    
    res.status(201).json({ success: true, message: 'Inquiry submitted successfully', inquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/inquiries/my - User's inquiries
router.get('/my', protect, async (req, res) => {
  try {
    const inquiries = await Inquiry.find({ user: req.user._id })
      .populate('land', 'title slug location images')
      .sort('-createdAt');
    res.json({ success: true, data: inquiries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
