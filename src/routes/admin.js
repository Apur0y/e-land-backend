import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import User from '../models/User.js';
import Land from '../models/Land.js';
import Report from '../models/Report.js';
import Inquiry from '../models/Inquiry.js';

const router = express.Router();

// All admin routes require admin role
router.use(protect, authorize('admin'));

// GET /api/admin/dashboard - Stats overview
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers, totalLands, totalReports, totalInquiries,
      newUsersToday, newLandsToday, newInquiriesToday,
      landsByType, landsByStatus, recentUsers, recentListings, recentInquiries
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      Land.countDocuments({ isActive: true }),
      Report.countDocuments(),
      Inquiry.countDocuments(),
      User.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
      Land.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
      Inquiry.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
      Land.aggregate([{ $group: { _id: '$landType', count: { $sum: 1 } } }]),
      Land.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      User.find({ role: { $ne: 'admin' } }).sort('-createdAt').limit(5).select('name email plan createdAt'),
      Land.find().sort('-createdAt').limit(5).populate('owner', 'name email').select('title price location status createdAt'),
      Inquiry.find().sort('-createdAt').limit(5).populate('land', 'title').select('name email type status createdAt'),
    ]);

    // Monthly user growth (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyUsers = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthlyListings = await Land.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        totals: { users: totalUsers, lands: totalLands, reports: totalReports, inquiries: totalInquiries },
        today: { users: newUsersToday, lands: newLandsToday, inquiries: newInquiriesToday },
        charts: { landsByType, landsByStatus, monthlyUsers, monthlyListings },
        recent: { users: recentUsers, listings: recentListings, inquiries: recentInquiries },
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, plan } = req.query;
    const query = {};
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (role) query.role = role;
    if (plan) query.plan = plan;
    
    const total = await User.countDocuments(query);
    const users = await User.find(query).sort('-createdAt').skip((page-1)*limit).limit(Number(limit));
    
    res.json({ success: true, data: users, pagination: { total, page: Number(page), pages: Math.ceil(total/limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', async (req, res) => {
  try {
    const { role, isActive, plan, aiCreditsLimit } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role, isActive, plan, aiCreditsLimit }, { new: true });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/listings
router.get('/listings', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, landType, verified } = req.query;
    const query = {};
    if (search) query.$or = [{ title: { $regex: search, $options: 'i' } }, { 'location.city': { $regex: search, $options: 'i' } }];
    if (status) query.status = status;
    if (landType) query.landType = landType;
    if (verified !== undefined) query.isVerified = verified === 'true';
    
    const total = await Land.countDocuments(query);
    const lands = await Land.find(query).populate('owner', 'name email').sort('-createdAt').skip((page-1)*limit).limit(Number(limit));
    
    res.json({ success: true, data: lands, pagination: { total, page: Number(page), pages: Math.ceil(total/limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/listings/:id
router.put('/listings/:id', async (req, res) => {
  try {
    const { isVerified, isFeatured, isActive, status } = req.body;
    const land = await Land.findByIdAndUpdate(req.params.id, { isVerified, isFeatured, isActive, status }, { new: true });
    res.json({ success: true, land });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/listings/:id
router.delete('/listings/:id', async (req, res) => {
  try {
    await Land.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Listing deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/inquiries
router.get('/inquiries', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = status ? { status } : {};
    const total = await Inquiry.countDocuments(query);
    const inquiries = await Inquiry.find(query)
      .populate('land', 'title slug')
      .populate('user', 'name email')
      .sort('-createdAt')
      .skip((page-1)*limit)
      .limit(Number(limit));
    res.json({ success: true, data: inquiries, pagination: { total, page: Number(page), pages: Math.ceil(total/limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/inquiries/:id
router.put('/inquiries/:id', async (req, res) => {
  try {
    const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, inquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/reports
router.get('/reports', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const total = await Report.countDocuments();
    const reports = await Report.find()
      .populate('user', 'name email')
      .populate('land', 'title')
      .sort('-createdAt')
      .skip((page-1)*limit)
      .limit(Number(limit));
    res.json({ success: true, data: reports, pagination: { total, page: Number(page), pages: Math.ceil(total/limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
