import express from 'express';
import Land from '../models/Land.js';
import { protect, authorize, optionalAuth } from '../middleware/auth.js';
import slugify from 'slugify';

const router = express.Router();

// GET /api/land - List with filters
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1, limit = 12, city, district, landType, status, minPrice, maxPrice,
      minArea, maxArea, sort = '-createdAt', featured, verified, search, facing
    } = req.query;

    const query = { isActive: true };
    
    if (city) query['location.city'] = { $regex: city, $options: 'i' };
    if (district) query['location.district'] = { $regex: district, $options: 'i' };
    if (landType) query.landType = landType;
    if (status) query.status = status;
    if (minPrice || maxPrice) query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
    if (minArea || maxArea) query.area = {};
    if (minArea) query.area.$gte = Number(minArea);
    if (maxArea) query.area.$lte = Number(maxArea);
    if (featured === 'true') query.isFeatured = true;
    if (verified === 'true') query.isVerified = true;
    if (facing) query['features.facingDirection'] = facing;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const total = await Land.countDocuments(query);
    const lands = await Land.find(query)
      .populate('owner', 'name email phone avatar')
      .populate('agent', 'name email phone avatar')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: lands,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/land/featured
router.get('/featured', async (req, res) => {
  try {
    const lands = await Land.find({ isActive: true, isFeatured: true, status: 'for_sale' })
      .populate('owner', 'name avatar')
      .sort('-createdAt')
      .limit(8)
      .lean();
    res.json({ success: true, data: lands });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/land/stats - Public market stats
router.get('/stats', async (req, res) => {
  try {
    const totalListings = await Land.countDocuments({ isActive: true });
    const forSale = await Land.countDocuments({ isActive: true, status: 'for_sale' });
    const sold = await Land.countDocuments({ status: 'sold' });
    
    const priceStats = await Land.aggregate([
      { $match: { isActive: true, status: 'for_sale' } },
      { $group: { _id: null, avgPrice: { $avg: '$price' }, minPrice: { $min: '$price' }, maxPrice: { $max: '$price' } } }
    ]);
    
    const cityStats = await Land.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$location.city', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    const typeStats = await Land.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$landType', count: { $sum: 1 } } }
    ]);

    res.json({ success: true, data: { totalListings, forSale, sold, priceStats: priceStats[0], cityStats, typeStats } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/land/:slug
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const land = await Land.findOne({ slug: req.params.slug, isActive: true })
      .populate('owner', 'name email phone avatar')
      .populate('agent', 'name email phone avatar');
    
    if (!land) return res.status(404).json({ success: false, message: 'Land not found' });
    
    // Increment views
    await Land.findByIdAndUpdate(land._id, { $inc: { views: 1 } });
    
    res.json({ success: true, data: land });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/land - Create listing
router.post('/', protect, async (req, res) => {
  try {
    const body = req.body;
    
    // Generate slug
    const baseSlug = slugify(`${body.title} ${body.location?.city || ''}`, { lower: true, strict: true });
    let slug = baseSlug;
    let count = 0;
    while (await Land.findOne({ slug })) {
      count++;
      slug = `${baseSlug}-${count}`;
    }
    
    // Calculate price per sqft
    if (body.price && body.area) {
      body.pricePerSqft = Math.round(body.price / body.area);
    }
    
    // SEO
    body.metaTitle = body.title;
    body.metaDescription = body.description?.substring(0, 160);
    
    const land = await Land.create({ 
      ...body, 
      slug, 
      owner: req.user._id,
      isVerified: req.user.role === 'admin',
    });
    
    res.status(201).json({ success: true, data: land });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/land/:id
router.put('/:id', protect, async (req, res) => {
  try {
    let land = await Land.findById(req.params.id);
    if (!land) return res.status(404).json({ success: false, message: 'Land not found' });
    
    if (land.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this listing' });
    }
    
    if (req.body.price && req.body.area) {
      req.body.pricePerSqft = Math.round(req.body.price / req.body.area);
    }
    
    land = await Land.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: land });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/land/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const land = await Land.findById(req.params.id);
    if (!land) return res.status(404).json({ success: false, message: 'Land not found' });
    
    if (land.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    await Land.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Listing removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/land/user/my-listings
router.get('/user/my-listings', protect, async (req, res) => {
  try {
    const lands = await Land.find({ owner: req.user._id }).sort('-createdAt');
    res.json({ success: true, data: lands });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
