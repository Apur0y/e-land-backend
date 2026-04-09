import { Router, Response } from 'express';
import Inquiry from '../models/Inquiry.js';
import Land from '../models/Land.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { IAuthenticatedRequest } from '../types/auth.js';

const router = Router();

// POST /api/inquiries
router.post('/', optionalAuth, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { landId, name, email, phone, message, type, budget } = req.body;

    if (!landId || !name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const land = await Land.findById(landId);
    if (!land) return res.status(404).json({ success: false, message: 'Land not found' });

    const inquiry = await Inquiry.create({
      land: landId,
      name,
      email,
      phone,
      message,
      type,
      budget,
      user: req.user?._id,
    });

    await Land.findByIdAndUpdate(landId, { $inc: { inquiries: 1 } });

    res.status(201).json({ success: true, message: 'Inquiry submitted successfully', inquiry });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// GET /api/inquiries/my
router.get('/my', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const inquiries = await Inquiry.find({ user: req.user?._id })
      .populate('land', 'title slug location images')
      .sort('-createdAt');
    res.json({ success: true, data: inquiries });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

export default router;
