import { Router, Response } from 'express';
import Land from '../models/Land.js';
import { protect, authorize, optionalAuth } from '../middleware/auth.js';
import { IAuthenticatedRequest } from '../types/auth.js';
import slugify from 'slugify';

const router = Router();

interface LandQuery {
  page?: string | number;
  limit?: string | number;
  city?: string;
  district?: string;
  landType?: string;
  status?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  minArea?: string | number;
  maxArea?: string | number;
  sort?: string;
  featured?: string;
  verified?: string;
  search?: string;
  facing?: string;
}

// GET /api/land - List with filters
router.get('/', optionalAuth, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const query = req.query as LandQuery;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 12;

    const filter: any = { isActive: true };

    if (query.city) filter['location.city'] = { $regex: query.city, $options: 'i' };
    if (query.district) filter['location.district'] = { $regex: query.district, $options: 'i' };
    if (query.landType) filter.landType = query.landType;
    if (query.status) filter.status = query.status;
    if (query.minPrice || query.maxPrice) {
      filter.price = {};
      if (query.minPrice) filter.price.$gte = Number(query.minPrice);
      if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
    }
    if (query.minArea || query.maxArea) {
      filter.area = {};
      if (query.minArea) filter.area.$gte = Number(query.minArea);
      if (query.maxArea) filter.area.$lte = Number(query.maxArea);
    }
    if (query.featured === 'true') filter.isFeatured = true;
    if (query.verified === 'true') filter.isVerified = true;
    if (query.facing) filter['features.facingDirection'] = query.facing;
    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
        { 'location.address': { $regex: query.search, $options: 'i' } },
        { tags: { $in: [new RegExp(query.search, 'i')] } },
      ];
    }

    const total = await Land.countDocuments(filter);
    const lands = await Land.find(filter)
      .populate('owner', 'name email phone avatar')
      .populate('agent', 'name email phone avatar')
      .sort(query.sort || '-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: lands,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// GET /api/land/featured
router.get('/featured', async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const lands = await Land.find({ isActive: true, isFeatured: true, status: 'for_sale' })
      .populate('owner', 'name avatar')
      .sort('-createdAt')
      .limit(8)
      .lean();
    res.json({ success: true, data: lands });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// GET /api/land/stats - Public market stats
router.get('/stats', async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const totalListings = await Land.countDocuments({ isActive: true });
    const forSale = await Land.countDocuments({ isActive: true, status: 'for_sale' });
    const sold = await Land.countDocuments({ status: 'sold' });

    const priceStats = await Land.aggregate([
      { $match: { isActive: true, status: 'for_sale' } },
      {
        $group: {
          _id: null,
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
    ]);

    const cityStats = await Land.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$location.city', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const typeStats = await Land.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$landType', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        totalListings,
        forSale,
        sold,
        priceStats: priceStats[0],
        cityStats,
        typeStats,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// GET /api/land/:slug
router.get('/:slug', optionalAuth, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const land = await Land.findOne({ slug: req.params.slug, isActive: true })
      .populate('owner', 'name email phone avatar')
      .populate('agent', 'name email phone avatar');

    if (!land) return res.status(404).json({ success: false, message: 'Land not found' });

    // Increment views
    await Land.findByIdAndUpdate(land._id, { $inc: { views: 1 } });

    res.json({ success: true, data: land });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// POST /api/land - Create listing
router.post('/', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const body = req.body;

    // Generate slug
    const baseSlug = slugify.default(`${body.title} ${body.location?.city || ''}`, { lower: true, strict: true });
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
      owner: req.user?._id,
      isVerified: req.user?.role === 'admin',
    });

    res.status(201).json({ success: true, data: land });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// PUT /api/land/:id
router.put('/:id', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    let land = await Land.findById(req.params.id);
    if (!land) return res.status(404).json({ success: false, message: 'Land not found' });

    if (land.owner.toString() !== req.user?._id?.toString() && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this listing' });
    }

    if (req.body.price && req.body.area) {
      req.body.pricePerSqft = Math.round(req.body.price / req.body.area);
    }

    land = await Land.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: land });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// DELETE /api/land/:id
router.delete('/:id', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const land = await Land.findById(req.params.id);
    if (!land) return res.status(404).json({ success: false, message: 'Land not found' });

    if (land.owner.toString() !== req.user?._id?.toString() && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Land.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Listing removed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// GET /api/land/user/my-listings
router.get('/user/my-listings', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const lands = await Land.find({ owner: req.user?._id }).sort('-createdAt');
    res.json({ success: true, data: lands });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

export default router;
