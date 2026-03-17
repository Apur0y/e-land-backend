import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { protect } from '../middleware/auth.js';
import Land from '../models/Land.js';
import Report from '../models/Report.js';
import User from '../models/User.js';

const router = express.Router();

const getGemini = () => {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
};

// Helper: check AI credits
const checkCredits = async (userId) => {
  const user = await User.findById(userId);
  if (user.plan === 'free' && user.aiCreditsUsed >= user.aiCreditsLimit) {
    throw new Error('AI credits exhausted. Please upgrade your plan.');
  }
  return user;
};

const incrementCredits = async (userId) => {
  await User.findByIdAndUpdate(userId, { $inc: { aiCreditsUsed: 1 } });
};

// POST /api/ai/analyze-land - Full AI analysis of a land
router.post('/analyze-land', protect, async (req, res) => {
  try {
    const user = await checkCredits(req.user._id);
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
- Features: Road Access: ${data.features?.roadAccess}, Electricity: ${data.features?.electricity}, Water: ${data.features?.water}, Flood Zone: ${data.features?.floodZone}, Corner Plot: ${data.features?.cornerPlot}, Road Width: ${data.features?.roadWidth || 'N/A'} ft, Facing: ${data.features?.facingDirection || 'N/A'}, Near Govt Project: ${data.features?.nearGovtProject}

Provide analysis as valid JSON only (no markdown, no backticks):
{
  "overallScore": <0-100 integer>,
  "investmentScore": <0-100 integer>,
  "riskScore": <0-100 integer, higher=riskier>,
  "summary": "<2-3 sentence professional summary>",
  "strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "weaknesses": ["<weakness1>", "<weakness2>"],
  "riskFactors": [
    {"factor": "<risk name>", "severity": "<low|medium|high>", "description": "<brief description>"}
  ],
  "priceProjection": {
    "currentFairValue": <estimated fair value BDT>,
    "year1": <price after 1 year BDT>,
    "year2": <price after 2 years BDT>,
    "year3": <price after 3 years BDT>,
    "year4": <price after 4 years BDT>,
    "year5": <price after 5 years BDT>
  },
  "annualAppreciation": <estimated annual appreciation %>,
  "rentalYield": <estimated annual rental yield %>,
  "constructionROI": <estimated ROI if constructed % over 3 years>,
  "recommendations": ["<recommendation1>", "<recommendation2>", "<recommendation3>"],
  "bestUseCase": "<optimal use for this land>",
  "nearbyInfrastructure": "<analysis of nearby infrastructure based on location>",
  "governmentProjectImpact": "<assessment of potential government project impact>",
  "marketTrend": "<bullish|neutral|bearish>",
  "liquidityScore": <0-100>,
  "verdict": "<buy|hold|avoid>"
}`;

    const model = getGemini();
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    let analysis;
    try {
      const cleaned = text.replace(/```json|```/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch (e) {
      return res.status(500).json({ success: false, message: 'AI returned invalid response. Please try again.' });
    }

    // Update land with AI analysis if landId provided
    if (landId && land) {
      await Land.findByIdAndUpdate(landId, {
        aiAnalysis: {
          ...analysis,
          priceProjection: analysis.priceProjection,
          analyzedAt: new Date(),
        }
      });
    }

    // Save report
    const report = await Report.create({
      user: req.user._id,
      land: landId || undefined,
      type: 'full_analysis',
      title: `AI Analysis: ${data.location?.address || 'Custom Land'}`,
      data: analysis,
      status: 'completed',
    });

    await incrementCredits(req.user._id);

    res.json({ success: true, analysis, reportId: report._id });
  } catch (error) {
    console.error('AI analyze error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai/price-prediction
router.post('/price-prediction', protect, async (req, res) => {
  try {
    await checkCredits(req.user._id);
    const { city, district, area, areaUnit, landType, currentPrice, features } = req.body;

    const prompt = `You are a real estate price prediction AI specializing in Bangladesh land market. Provide a 5-year price prediction.

INPUT:
- City: ${city}, District: ${district}
- Area: ${area} ${areaUnit}
- Land Type: ${landType}
- Current Price: BDT ${currentPrice?.toLocaleString() || 'Unknown'}
- Road Access: ${features?.roadAccess}, Flood Zone: ${features?.floodZone}, Near Development: ${features?.nearGovtProject}

Return only valid JSON:
{
  "currentMarketValue": <BDT>,
  "predictions": {
    "year1": {"price": <BDT>, "growth": <% from current>},
    "year2": {"price": <BDT>, "growth": <% from current>},
    "year3": {"price": <BDT>, "growth": <% from current>},
    "year4": {"price": <BDT>, "growth": <% from current>},
    "year5": {"price": <BDT>, "growth": <% from current>}
  },
  "cagr": <compound annual growth rate %>,
  "keyDrivers": ["<driver1>", "<driver2>", "<driver3>"],
  "risks": ["<risk1>", "<risk2>"],
  "marketOutlook": "<brief market analysis for this area>",
  "confidenceLevel": "<low|medium|high>"
}`;

    const model = getGemini();
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    
    let prediction;
    try { prediction = JSON.parse(text); }
    catch (e) { return res.status(500).json({ success: false, message: 'AI error. Please retry.' }); }

    await Report.create({
      user: req.user._id, type: 'price_prediction',
      title: `Price Prediction: ${city}, ${district}`,
      data: prediction, status: 'completed',
    });

    await incrementCredits(req.user._id);
    res.json({ success: true, prediction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai/risk-analysis
router.post('/risk-analysis', protect, async (req, res) => {
  try {
    await checkCredits(req.user._id);
    const { location, features, landType, price, area } = req.body;

    const prompt = `As a land risk analyst for Bangladesh real estate market, analyze all risks for this land.

PROPERTY:
- Location: ${location?.address}, ${location?.city}, ${location?.district}
- Type: ${landType}, Area: ${area}
- Price: BDT ${price?.toLocaleString()}
- Flood Zone: ${features?.floodZone}, Road Access: ${features?.roadAccess}
- Near Govt Project: ${features?.nearGovtProject}

Return only valid JSON:
{
  "overallRiskLevel": "<low|medium|high|very_high>",
  "riskScore": <0-100>,
  "risks": [
    {
      "category": "<flood|legal|infrastructure|market|environmental|development>",
      "name": "<risk name>",
      "severity": "<low|medium|high>",
      "probability": "<low|medium|high>",
      "impact": "<description of impact>",
      "mitigation": "<how to mitigate>"
    }
  ],
  "floodRisk": { "level": "<low|medium|high>", "details": "<analysis>" },
  "legalRisk": { "level": "<low|medium|high>", "details": "<analysis>" },
  "infrastructureRisk": { "level": "<low|medium|high>", "details": "<analysis>" },
  "marketRisk": { "level": "<low|medium|high>", "details": "<analysis>" },
  "governmentProjectNearby": "<analysis of govt projects in ${location?.district} area>",
  "safetyScore": <0-100, higher=safer>,
  "insuranceRecommendation": "<insurance advice>",
  "dueDiligenceChecklist": ["<item1>", "<item2>", "<item3>", "<item4>", "<item5>"]
}`;

    const model = getGemini();
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    
    let riskData;
    try { riskData = JSON.parse(text); }
    catch (e) { return res.status(500).json({ success: false, message: 'AI error. Please retry.' }); }

    await Report.create({
      user: req.user._id, type: 'risk_assessment',
      title: `Risk Analysis: ${location?.city}`,
      data: riskData, status: 'completed',
    });

    await incrementCredits(req.user._id);
    res.json({ success: true, riskData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai/rental-yield
router.post('/rental-yield', protect, async (req, res) => {
  try {
    await checkCredits(req.user._id);
    const { city, district, area, areaUnit, landType, purchasePrice, constructionCost } = req.body;

    const prompt = `Calculate rental yield and ROI for Bangladesh real estate.

PROPERTY:
- Location: ${city}, ${district}
- Area: ${area} ${areaUnit}, Type: ${landType}
- Purchase Price: BDT ${purchasePrice?.toLocaleString()}
- Construction Cost: BDT ${constructionCost?.toLocaleString() || 'N/A'}

Return only valid JSON:
{
  "estimatedMonthlyRent": <BDT>,
  "estimatedAnnualRent": <BDT>,
  "grossRentalYield": <% per year>,
  "netRentalYield": <% after expenses>,
  "occupancyRate": <%>,
  "annualExpenses": {
    "maintenance": <BDT>,
    "tax": <BDT>,
    "insurance": <BDT>,
    "management": <BDT>,
    "total": <BDT>
  },
  "paybackPeriod": <years to recover investment>,
  "constructionROI": <% if construction included>,
  "cashflow": {
    "monthly": <BDT net monthly>,
    "annual": <BDT net annual>
  },
  "comparison": {
    "vsFixedDeposit": "<comparison with bank FD rates>",
    "vsStockMarket": "<comparison>",
    "vsBondMarket": "<comparison>"
  },
  "rentalDemand": "<high|medium|low for this area>",
  "recommendation": "<detailed recommendation>"
}`;

    const model = getGemini();
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    
    let yieldData;
    try { yieldData = JSON.parse(text); }
    catch (e) { return res.status(500).json({ success: false, message: 'AI error. Please retry.' }); }

    await incrementCredits(req.user._id);
    res.json({ success: true, yieldData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai/compare-properties
router.post('/compare-properties', protect, async (req, res) => {
  try {
    await checkCredits(req.user._id);
    const { properties } = req.body; // Array of up to 3 property objects

    if (!properties || properties.length < 2 || properties.length > 3) {
      return res.status(400).json({ success: false, message: 'Provide 2-3 properties to compare' });
    }

    const propText = properties.map((p, i) => `
Property ${i + 1}: ${p.title || 'Property ' + (i + 1)}
- Location: ${p.location?.city}, ${p.location?.district}
- Price: BDT ${p.price?.toLocaleString()}, Area: ${p.area} ${p.areaUnit}
- Type: ${p.landType}, Status: ${p.status}
- Road Access: ${p.features?.roadAccess}, Flood Zone: ${p.features?.floodZone}
- AI Score: ${p.aiAnalysis?.overallScore || 'Not analyzed'}`).join('\n');

    const prompt = `Compare these ${properties.length} land properties for investment in Bangladesh.

${propText}

Return only valid JSON:
{
  "winner": <1|2|3>,
  "winnerReason": "<why this property wins>",
  "scores": {
    "property1": {"investment": <0-100>, "value": <0-100>, "risk": <0-100>, "growth": <0-100>, "overall": <0-100>},
    "property2": {"investment": <0-100>, "value": <0-100>, "risk": <0-100>, "growth": <0-100>, "overall": <0-100>}
    ${properties.length === 3 ? ',"property3": {"investment": <0-100>, "value": <0-100>, "risk": <0-100>, "growth": <0-100>, "overall": <0-100>}' : ''}
  },
  "comparison": {
    "bestValue": <1|2|3>,
    "bestGrowthPotential": <1|2|3>,
    "lowestRisk": <1|2|3>,
    "bestLocation": <1|2|3>
  },
  "pros": {
    "property1": ["<pro1>", "<pro2>"],
    "property2": ["<pro1>", "<pro2>"]
    ${properties.length === 3 ? ',"property3": ["<pro1>", "<pro2>"]' : ''}
  },
  "cons": {
    "property1": ["<con1>"],
    "property2": ["<con1>"]
    ${properties.length === 3 ? ',"property3": ["<con1>"]' : ''}
  },
  "summary": "<comprehensive comparison summary>",
  "forConservativeInvestor": <1|2|3>,
  "forAggressiveInvestor": <1|2|3>
}`;

    const model = getGemini();
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    
    let comparison;
    try { comparison = JSON.parse(text); }
    catch (e) { return res.status(500).json({ success: false, message: 'AI error. Please retry.' }); }

    await Report.create({
      user: req.user._id, type: 'comparison',
      title: 'Property Comparison Report',
      data: { comparison, properties },
      status: 'completed',
    });

    await incrementCredits(req.user._id);
    res.json({ success: true, comparison, properties });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai/construction-roi
router.post('/construction-roi', protect, async (req, res) => {
  try {
    await checkCredits(req.user._id);
    const { city, district, landPrice, landArea, areaUnit, buildingType, floors, budget } = req.body;

    const prompt = `Calculate construction ROI for Bangladesh real estate development.

PROJECT:
- Location: ${city}, ${district}
- Land Price: BDT ${landPrice?.toLocaleString()}, Area: ${landArea} ${areaUnit}
- Building Type: ${buildingType} (residential/commercial/mixed)
- Floors: ${floors}, Construction Budget: BDT ${budget?.toLocaleString()}

Return only valid JSON:
{
  "totalInvestment": <land + construction BDT>,
  "constructionCostPerSqft": <BDT>,
  "estimatedConstructionCost": <BDT>,
  "totalProjectCost": <BDT>,
  "projectTimeline": "<estimated months>",
  "completionValue": <estimated market value after completion BDT>,
  "grossROI": <%>,
  "netROI": <% after taxes and fees>,
  "annualizedROI": <% per year>,
  "rentalIncome": {
    "monthlyGross": <BDT>,
    "annualGross": <BDT>,
    "netYield": <%>
  },
  "saleScenario": {
    "estimatedSalePrice": <BDT>,
    "profit": <BDT>,
    "roi": <%>
  },
  "breakEvenTimeline": "<months to break even via rental>",
  "risks": ["<risk1>", "<risk2>"],
  "recommendations": ["<rec1>", "<rec2>"],
  "feasibilityScore": <0-100>,
  "verdict": "<highly feasible|feasible|marginal|not recommended>"
}`;

    const model = getGemini();
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    
    let roiData;
    try { roiData = JSON.parse(text); }
    catch (e) { return res.status(500).json({ success: false, message: 'AI error. Please retry.' }); }

    await incrementCredits(req.user._id);
    res.json({ success: true, roiData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/ai/my-reports
router.get('/my-reports', protect, async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id })
      .populate('land', 'title slug location')
      .sort('-createdAt')
      .limit(20);
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/ai/credits
router.get('/credits', protect, async (req, res) => {
  const user = await User.findById(req.user._id).select('aiCreditsUsed aiCreditsLimit plan');
  res.json({ success: true, used: user.aiCreditsUsed, limit: user.aiCreditsLimit, plan: user.plan });
});

export default router;
