import { Router, Response } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import User from '../models/User.js';
import Land from '../models/Land.js';
import Report from '../models/Report.js';
import Inquiry from '../models/Inquiry.js';
import { IAuthenticatedRequest } from '../types/auth.js';

const router = Router();

// All admin routes require admin role
router.use(protect, authorize('admin'));

interface AdminQuery {
  page?: string;
  limit?: string;
  search?: string;
  role?: string;
  plan?: string;
  status?: string;
  landType?: string;
  verified?: string;
}

// GET /api/admin/dashboard
router.get('/dashboard', async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const [
      totalUsers,
      totalLands,
      totalReports,
      totalInquiries,
      newUsersToday,
      newLandsToday,
      newInquiriesToday,
      landsByType,
      landsByStatus,
      recentUsers,
      recentListings,
      recentInquiries,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      Land.countDocuments({ isActive: true }),
      Report.countDocuments(),
      Inquiry.countDocuments(),
      User.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      Land.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      Inquiry.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      Land.aggregate([{ $group: { _id: '$landType', count: { $sum: 1 } } }]),
      Land.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      User.find({ role: { $ne: 'admin' } })
        .sort('-createdAt')
        .limit(5)
        .select('name email plan createdAt'),
      Land.find()
        .sort('-createdAt')
        .limit(5)
        .populate('owner', 'name email')
        .select('title price location status createdAt'),
      Inquiry.find()
        .sort('-createdAt')
        .limit(5)
        .populate('land', 'title')
        .select('name email type status createdAt'),
    ]);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyUsers = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthlyListings = await Land.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      success: true,
      data: {
        totals: { users: totalUsers, lands: totalLands, reports: totalReports, inquiries: totalInquiries },
        today: { users: newUsersToday, lands: newLandsToday, inquiries: newInquiriesToday },
        charts: { landsByType, landsByStatus, monthlyUsers, monthlyListings },
        recent: { users: recentUsers, listings: recentListings, inquiries: recentInquiries },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// GET /api/admin/users
router.get('/users', async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const query = req.query as AdminQuery;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const filter: any = {};
    if (query.search) {
      filter.$or = [{ name: { $regex: query.search, $options: 'i' } }, { email: { $regex: query.search, $options: 'i' } }];
    }
    if (query.role) filter.role = query.role;
    if (query.plan) filter.plan = query.plan;

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      data: users,
      pagination: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { role, isActive, plan, aiCreditsLimit } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role, isActive, plan, aiCreditsLimit }, { new: true });
    res.json({ success: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// GET /api/admin/listings
router.get('/listings', async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const query = req.query as AdminQuery;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const filter: any = {};
    if (query.search) {
      filter.$or = [{ title: { $regex: query.search, $options: 'i' } }, { 'location.city': { $regex: query.search, $options: 'i' } }];
    }
    if (query.status) filter.status = query.status;
    if (query.landType) filter.landType = query.landType;
    if (query.verified !== undefined) filter.isVerified = query.verified === 'true';

    const total = await Land.countDocuments(filter);
    const lands = await Land.find(filter)
      .populate('owner', 'name email')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      data: lands,
      pagination: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// PUT /api/admin/listings/:id
router.put('/listings/:id', async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { isVerified, isFeatured, isActive, status } = req.body;
    const land = await Land.findByIdAndUpdate(req.params.id, { isVerified, isFeatured, isActive, status }, { new: true });
    res.json({ success: true, land });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// DELETE /api/admin/listings/:id
router.delete('/listings/:id', async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    await Land.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Listing deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// GET /api/admin/inquiries
router.get('/inquiries', async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const query = req.query as AdminQuery;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const filter: any = query.status ? { status: query.status } : {};
    const total = await Inquiry.countDocuments(filter);
    const inquiries = await Inquiry.find(filter)
      .populate('land', 'title slug')
      .populate('user', 'name email')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      data: inquiries,
      pagination: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// PUT /api/admin/inquiries/:id
router.put('/inquiries/:id', async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, inquiry });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// GET /api/admin/reports
router.get('/reports', async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const query = req.query as AdminQuery;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const total = await Report.countDocuments();
    const reports = await Report.find()
      .populate('user', 'name email')
      .populate('land', 'title')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      data: reports,
      pagination: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

export default router;
