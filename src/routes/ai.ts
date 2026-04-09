import { Router, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { protect } from '../middleware/auth.js';
import Land from '../models/Land.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import { IAuthenticatedRequest } from '../types/auth.js';

const router = Router();

const getGemini = () => {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
};

const checkCredits = async (userId: string) => {
  const user = await User.findById(userId);
  if (user?.plan === 'free' && user.aiCreditsUsed >= user.aiCreditsLimit) {
    throw new Error('AI credits exhausted. Please upgrade your plan.');
  }
  return user;
};

const incrementCredits = async (userId: string): Promise<void> => {
  await User.findByIdAndUpdate(userId, { $inc: { aiCreditsUsed: 1 } });
};

// POST /api/ai/analyze-land
router.post('/analyze-land', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    await checkCredits(req.user?._id?.toString() || '');
    const { landId, landData } = req.body;

    let land = null;
    let data = landData;

    if (landId) {
      land = await Land.findById(landId);
      if (!land) return res.status(404).json({ success: false, message: 'Land not found' });
      data = {
        title: land.title,
        location: land.location,
        area: land.area,
        areaUnit: land.areaUnit,
        price: land.price,
        landType: land.landType,
        features: land.features,
      };
    }

    if (!data) return res.status(400).json({ success: false, message: 'Land data required' });

    const prompt = `You are LandIQ AI, an expert land investment analyst. Analyze this land and provide a comprehensive JSON report.

LAND DATA:
- Location: ${data.location?.address}, ${data.location?.city}, ${data.location?.district}, ${data.location?.country || 'Bangladesh'}
- Area: ${data.area} ${data.areaUnit}
- Price: ${data.price ? `BDT ${data.price.toLocaleString()}` : 'Not specified'}
- Land Type: ${data.landType}
- Features: Road Access: ${data.features?.roadAccess}, Electricity: ${data.features?.electricity}, Water: ${data.features?.water}, Flood Zone: ${data.features?.floodZone}, Corner Plot: ${data.features?.cornerPlot}

Provide analysis as valid JSON only:
{
  "overallScore": <0-100>,
  "investmentScore": <0-100>,
  "riskScore": <0-100>,
  "summary": "<summary>",
  "strengths": ["<s1>", "<s2>"],
  "weaknesses": ["<w1>", "<w2>"],
  "riskFactors": [{"factor": "<risk>", "severity": "<low|medium|high>", "description": "<desc>"}],
  "priceProjection": {"year1": <price>, "year2": <price>, "year3": <price>, "year4": <price>, "year5": <price>},
  "rentalYield": <percentage>,
  "recommendations": ["<rec1>", "<rec2>"],
  "verdict": "<buy|hold|avoid>"
}`;

    const model = getGemini();
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    let analysis: any;
    try {
      const cleaned = text.replace(/```json|```/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch (e) {
      return res.status(500).json({ success: false, message: 'AI returned invalid response' });
    }

    if (landId && land) {
      await Land.findByIdAndUpdate(landId, {
        aiAnalysis: {
          ...analysis,
          analyzedAt: new Date(),
        },
      });
    }

    const report = await Report.create({
      user: req.user?._id,
      land: landId || undefined,
      type: 'full_analysis',
      title: `AI Analysis: ${data.location?.address || 'Custom Land'}`,
      data: analysis,
      status: 'completed',
    });

    await incrementCredits(req.user?._id?.toString() || '');

    res.json({ success: true, analysis, reportId: report._id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('AI analyze error:', message);
    res.status(500).json({ success: false, message });
  }
});

// POST /api/ai/price-prediction
router.post('/price-prediction', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    await checkCredits(req.user?._id?.toString() || '');
    const { city, district, area, areaUnit, landType, currentPrice, features } = req.body;

    const prompt = `You are a real estate price prediction AI. Provide a 5-year price prediction.

INPUT:
- Location: ${city}, ${district}
- Area: ${area} ${areaUnit}, Type: ${landType}
- Current Price: BDT ${currentPrice?.toLocaleString()}

Return only valid JSON:
{
  "currentMarketValue": <BDT>,
  "predictions": {"year1": {"price": <BDT>, "growth": <%>}, "year2": {"price": <BDT>, "growth": <%>}},
  "cagr": <percentage>,
  "keyDrivers": ["<driver1>", "<driver2>"],
  "confidenceLevel": "<low|medium|high>"
}`;

    const model = getGemini();
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();

    let prediction: any;
    try {
      prediction = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ success: false, message: 'AI error' });
    }

    await Report.create({
      user: req.user?._id,
      type: 'price_prediction',
      title: `Price Prediction: ${city}, ${district}`,
      data: prediction,
      status: 'completed',
    });

    await incrementCredits(req.user?._id?.toString() || '');
    res.json({ success: true, prediction });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// POST /api/ai/risk-analysis
router.post('/risk-analysis', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    await checkCredits(req.user?._id?.toString() || '');
    const { location, features, landType, price, area } = req.body;

    const prompt = `As a land risk analyst, analyze all risks for this property.

PROPERTY:
- Location: ${location?.city}, ${location?.district}
- Type: ${landType}, Area: ${area}
- Flood Zone: ${features?.floodZone}

Return only valid JSON with risk analysis`;

    const model = getGemini();
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();

    let riskData: any;
    try {
      riskData = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ success: false, message: 'AI error' });
    }

    await Report.create({
      user: req.user?._id,
      type: 'risk_assessment',
      title: `Risk Analysis: ${location?.city}`,
      data: riskData,
      status: 'completed',
    });

    await incrementCredits(req.user?._id?.toString() || '');
    res.json({ success: true, riskData });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// POST /api/ai/rental-yield
router.post('/rental-yield', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    await checkCredits(req.user?._id?.toString() || '');
    const { city, district, area, areaUnit, landType, purchasePrice, constructionCost } = req.body;

    const prompt = `Calculate rental yield and ROI for Bangladesh real estate.

PROPERTY:
- Location: ${city}, ${district}
- Area: ${area} ${areaUnit}, Type: ${landType}
- Purchase Price: BDT ${purchasePrice?.toLocaleString()}

Return only valid JSON with yield calculations`;

    const model = getGemini();
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();

    let yieldData: any;
    try {
      yieldData = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ success: false, message: 'AI error' });
    }

    await incrementCredits(req.user?._id?.toString() || '');
    res.json({ success: true, yieldData });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// POST /api/ai/compare-properties
router.post('/compare-properties', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    await checkCredits(req.user?._id?.toString() || '');
    const { properties } = req.body;

    if (!properties || properties.length < 2 || properties.length > 3) {
      return res.status(400).json({ success: false, message: 'Provide 2-3 properties to compare' });
    }

    const propText = properties
      .map((p: any, i: number) => `Property ${i + 1}: ${p.title || 'Property ' + (i + 1)} - ${p.location?.city} - BDT ${p.price}`)
      .join('\n');

    const prompt = `Compare these ${properties.length} properties for investment.

${propText}

Return only valid JSON with comparison scores`;

    const model = getGemini();
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();

    let comparison: any;
    try {
      comparison = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ success: false, message: 'AI error' });
    }

    await Report.create({
      user: req.user?._id,
      type: 'comparison',
      title: 'Property Comparison',
      data: { comparison, properties },
      status: 'completed',
    });

    await incrementCredits(req.user?._id?.toString() || '');
    res.json({ success: true, comparison, properties });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// POST /api/ai/construction-roi
router.post('/construction-roi', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    await checkCredits(req.user?._id?.toString() || '');
    const { city, district, landPrice, landArea, areaUnit, buildingType, floors, budget } = req.body;

    const prompt = `Calculate construction ROI for Bangladesh real estate development.

PROJECT:
- Location: ${city}, ${district}
- Land Price: BDT ${landPrice}, Area: ${landArea} ${areaUnit}
- Building Type: ${buildingType}, Floors: ${floors}
- Budget: BDT ${budget}

Return only valid JSON with ROI analysis`;

    const model = getGemini();
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();

    let roiData: any;
    try {
      roiData = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ success: false, message: 'AI error' });
    }

    await incrementCredits(req.user?._id?.toString() || '');
    res.json({ success: true, roiData });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// GET /api/ai/my-reports
router.get('/my-reports', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const reports = await Report.find({ user: req.user?._id })
      .populate('land', 'title slug location')
      .sort('-createdAt')
      .limit(20);
    res.json({ success: true, data: reports });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

// GET /api/ai/credits
router.get('/credits', protect, async (req: IAuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const user = await User.findById(req.user?._id).select('aiCreditsUsed aiCreditsLimit plan');
    res.json({ success: true, used: user?.aiCreditsUsed, limit: user?.aiCreditsLimit, plan: user?.plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ success: false, message });
  }
});

export default router;
