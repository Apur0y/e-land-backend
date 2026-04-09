import { Router, Response } from 'express';
import Report from '../models/Report.js';
import { protect } from '../middleware/auth.js';
import { IAuthenticatedRequest } from '../types/auth.js';

const router = Router();

// GET /api/reports/my
router.get('/my', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const reports = await Report.find({ user: req.user?._id })
      .populate('land', 'title slug location images')
      .sort('-createdAt')
      .limit(50);
    res.json({ success: true, data: reports });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// GET /api/reports/:id
router.get('/:id', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const report = await Report.findOne({ _id: req.params.id, user: req.user?._id }).populate('land');
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, data: report });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// DELETE /api/reports/:id
router.delete('/:id', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    await Report.findOneAndDelete({ _id: req.params.id, user: req.user?._id });
    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

export default router;
