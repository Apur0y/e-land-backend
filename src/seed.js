import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

// ─── Models ────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name: String, email: { type: String, unique: true }, password: String,
  role: { type: String, default: 'user' }, isVerified: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true }, plan: { type: String, default: 'free' },
  aiCreditsUsed: { type: Number, default: 0 }, aiCreditsLimit: { type: Number, default: 10 },
  savedProperties: [mongoose.Schema.Types.ObjectId],
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

const landSchema = new mongoose.Schema({
  title: String, slug: { type: String, unique: true }, description: String,
  price: Number, pricePerSqft: Number, area: Number, areaUnit: String,
  location: { address: String, city: String, district: String, country: String },
  landType: String, status: { type: String, default: 'for_sale' },
  features: { roadAccess: Boolean, electricity: Boolean, water: Boolean,
    cornerPlot: Boolean, floodZone: Boolean, facingDirection: String, roadWidth: Number },
  images: [{ url: String, isPrimary: Boolean }],
  aiAnalysis: mongoose.Schema.Types.Mixed,
  owner: mongoose.Schema.Types.ObjectId,
  isFeatured: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  views: { type: Number, default: 0 },
  inquiries: { type: Number, default: 0 },
  tags: [String],
  metaTitle: String, metaDescription: String,
}, { timestamps: true });
const Land = mongoose.model('Land', landSchema);

// ─── Demo Data ─────────────────────────────────────────────
const demoUsers = [
  { name: 'Admin User', email: process.env.ADMIN_EMAIL || 'admin@landiq.com', password: process.env.ADMIN_PASSWORD || 'Admin@123456', role: 'admin', plan: 'enterprise', aiCreditsLimit: 9999 },
  { name: 'Rafiqul Islam', email: 'rafiq@demo.com', password: 'Demo@123456', role: 'user', plan: 'pro', aiCreditsLimit: 100 },
  { name: 'Nasreen Ahmed', email: 'nasreen@demo.com', password: 'Demo@123456', role: 'agent', plan: 'pro', aiCreditsLimit: 100 },
  { name: 'Kamal Hossain', email: 'kamal@demo.com', password: 'Demo@123456', role: 'user', plan: 'free', aiCreditsLimit: 10 },
];

const demoListings = [
  {
    title: 'Prime Commercial Plot, Gulshan-2',
    slug: 'prime-commercial-plot-gulshan-2',
    description: 'Exceptional commercial land in the heart of Gulshan-2, Dhaka. This prime location offers maximum visibility and footfall. Ideal for office buildings, retail developments, or mixed-use projects. The plot is surrounded by embassies, corporate offices, and high-end restaurants.',
    price: 45000000,
    area: 5,
    areaUnit: 'katha',
    location: { address: 'Road 12, Gulshan-2', city: 'Dhaka', district: 'Dhaka', country: 'Bangladesh' },
    landType: 'commercial',
    status: 'for_sale',
    features: { roadAccess: true, electricity: true, water: true, cornerPlot: true, floodZone: false, facingDirection: 'north', roadWidth: 40 },
    isFeatured: true,
    tags: ['gulshan', 'commercial', 'corner plot', 'prime location'],
    aiAnalysis: {
      overallScore: 92, investmentScore: 95, riskScore: 15,
      summary: 'Exceptional commercial property in Dhaka\'s most prestigious business district. High appreciation potential with strong demand from multinational companies.',
      riskFactors: [{ factor: 'Traffic congestion', severity: 'low', description: 'Peak hour congestion may affect access' }],
      priceProjection: { currentFairValue: 45000000, year1: 51750000, year2: 59512500, year3: 68439375, year4: 78705281, year5: 90511073 },
      annualAppreciation: 15, rentalYield: 6.2, constructionROI: 180,
      recommendations: ['Ideal for Grade A office development', 'Consider mixed-use to maximize returns'],
      bestUseCase: 'Grade A commercial office tower or luxury mixed-use development',
      marketTrend: 'bullish', liquidityScore: 92, verdict: 'buy', analyzedAt: new Date(),
    },
    views: 1240, inquiries: 18,
  },
  {
    title: 'Residential Plot Near Bashundhara City',
    slug: 'residential-plot-bashundhara-city',
    description: 'Well-located residential land in Bashundhara R/A, one of Dhaka\'s most sought-after residential neighborhoods. The area has all modern amenities and excellent infrastructure. Perfect for building your dream home or a residential apartment complex.',
    price: 32000000,
    area: 5,
    areaUnit: 'katha',
    location: { address: 'Block G, Bashundhara R/A', city: 'Dhaka', district: 'Dhaka', country: 'Bangladesh' },
    landType: 'residential',
    status: 'for_sale',
    features: { roadAccess: true, electricity: true, water: true, gas: true, cornerPlot: false, floodZone: false, facingDirection: 'east', roadWidth: 30 },
    isFeatured: true,
    tags: ['bashundhara', 'residential', 'family home'],
    aiAnalysis: {
      overallScore: 88, investmentScore: 85, riskScore: 20,
      summary: 'Premium residential land in Bashundhara R/A with excellent connectivity and modern amenities. Strong long-term appreciation expected.',
      riskFactors: [{ factor: 'Price premium', severity: 'low', description: 'Already priced at market premium' }],
      priceProjection: { currentFairValue: 32000000, year1: 35840000, year2: 40140800, year3: 44957696, year4: 50352619, year5: 56394934 },
      annualAppreciation: 12, rentalYield: 4.8, constructionROI: 140,
      recommendations: ['Build 6-storey apartment for maximum ROI', 'Current market favors residential development'],
      bestUseCase: 'Luxury residential apartment building',
      marketTrend: 'bullish', liquidityScore: 85, verdict: 'buy', analyzedAt: new Date(),
    },
    views: 892, inquiries: 11,
  },
  {
    title: 'Agricultural Land with Development Potential',
    slug: 'agricultural-land-comilla-sadar',
    description: 'Fertile agricultural land in Comilla Sadar with excellent road connectivity. Located near the upcoming Comilla Economic Zone, this land has significant potential for value appreciation. Currently used for rice cultivation.',
    price: 4500000,
    area: 2,
    areaUnit: 'bigha',
    location: { address: 'Comilla Sadar Upazila', city: 'Comilla', district: 'Comilla', country: 'Bangladesh' },
    landType: 'agricultural',
    status: 'for_sale',
    features: { roadAccess: true, electricity: true, water: true, cornerPlot: false, floodZone: false, facingDirection: 'south', roadWidth: 20 },
    isFeatured: false,
    tags: ['comilla', 'agricultural', 'economic zone', 'development potential'],
    aiAnalysis: {
      overallScore: 74, investmentScore: 78, riskScore: 35,
      summary: 'Strategic agricultural land near Comilla Economic Zone with medium-term conversion potential. Patient investors can expect above-average returns.',
      riskFactors: [
        { factor: 'Conversion timeline', severity: 'medium', description: 'Land use change approval may take 2-4 years' },
        { factor: 'Flood risk', severity: 'low', description: 'Minor flood risk during monsoon season' }
      ],
      priceProjection: { currentFairValue: 4500000, year1: 5085000, year2: 5746050, year3: 6493037, year4: 7337131, year5: 8290957 },
      annualAppreciation: 13, rentalYield: 3.2, constructionROI: 95,
      recommendations: ['Hold for 3-5 years for economic zone appreciation', 'Consider leasing for farming in the interim'],
      bestUseCase: 'Industrial or logistics warehouse after land conversion',
      marketTrend: 'neutral', liquidityScore: 55, verdict: 'buy', analyzedAt: new Date(),
    },
    views: 445, inquiries: 6,
  },
  {
    title: "Beachfront Plot, Cox's Bazar",
    slug: 'beachfront-plot-coxs-bazar',
    description: "Rare beachfront land in Cox's Bazar, the world's longest natural sea beach. Located just 200 meters from the beach with unobstructed sea views. Perfect for a boutique hotel, resort, or high-end guesthouse. Tourism growth in the area makes this an exceptional investment.",
    price: 60000000,
    area: 4,
    areaUnit: 'katha',
    location: { address: 'Kolatoli Beach Road', city: "Cox's Bazar", district: "Cox's Bazar", country: 'Bangladesh' },
    landType: 'commercial',
    status: 'for_sale',
    features: { roadAccess: true, electricity: true, water: true, cornerPlot: true, floodZone: false, facingDirection: 'west', roadWidth: 25 },
    isFeatured: true,
    tags: ["cox's bazar", 'beachfront', 'tourism', 'hospitality', 'resort'],
    aiAnalysis: {
      overallScore: 95, investmentScore: 98, riskScore: 12,
      summary: "Exceptional beachfront land in Bangladesh's premier tourism destination. Irreplaceable location with massive upside as Cox's Bazar tourism industry expands with the new airport and expressway.",
      riskFactors: [{ factor: 'Cyclone risk', severity: 'low', description: 'Structural engineering required for coastal resilience' }],
      priceProjection: { currentFairValue: 60000000, year1: 72000000, year2: 86400000, year3: 103680000, year4: 124416000, year5: 149299200 },
      annualAppreciation: 20, rentalYield: 8.5, constructionROI: 220,
      recommendations: ['Build boutique hotel immediately', 'Apply for tourism investment incentives', 'Partner with hotel chains'],
      bestUseCase: '4-star boutique beach hotel or luxury resort',
      marketTrend: 'bullish', liquidityScore: 88, verdict: 'buy', analyzedAt: new Date(),
    },
    views: 2180, inquiries: 34,
  },
  {
    title: 'Industrial Plot, Gazipur BSCIC',
    slug: 'industrial-plot-gazipur-bscic',
    description: 'Strategic industrial land within Gazipur BSCIC Industrial City. The plot is fully serviced with all utilities and has direct access to the Dhaka-Mymensingh Highway. Suitable for garment factories, warehouses, or light manufacturing.',
    price: 21000000,
    area: 10,
    areaUnit: 'katha',
    location: { address: 'BSCIC Industrial Area, Tongi', city: 'Gazipur', district: 'Gazipur', country: 'Bangladesh' },
    landType: 'industrial',
    status: 'for_sale',
    features: { roadAccess: true, electricity: true, water: true, gas: true, drainage: true, cornerPlot: false, floodZone: false, roadWidth: 30 },
    isFeatured: false,
    tags: ['gazipur', 'industrial', 'bscic', 'factory', 'warehouse'],
    aiAnalysis: {
      overallScore: 80, investmentScore: 82, riskScore: 25,
      summary: 'Solid industrial investment in Bangladesh\'s manufacturing hub. Good infrastructure, stable tenants, and steady demand from garment and export sectors.',
      riskFactors: [{ factor: 'Labour market changes', severity: 'medium', description: 'Automation may affect garment sector demand' }],
      priceProjection: { currentFairValue: 21000000, year1: 23310000, year2: 25874100, year3: 28720251, year4: 31879478, year5: 35386221 },
      annualAppreciation: 11, rentalYield: 7.2, constructionROI: 155,
      recommendations: ['Ideal for industrial REIT portfolio', 'Build standard factory sheds for lease'],
      bestUseCase: 'Multi-tenant industrial park or logistics hub',
      marketTrend: 'neutral', liquidityScore: 72, verdict: 'buy', analyzedAt: new Date(),
    },
    views: 620, inquiries: 8,
  },
  {
    title: 'Corner Residential Plot, Uttara Sector 7',
    slug: 'corner-residential-plot-uttara-sector-7',
    description: 'Coveted corner plot in Uttara Sector 7, close to Hazrat Shahjalal International Airport and the upcoming Metrorail extension. The location offers easy access to both old and new Dhaka via the airport road and BRT.',
    price: 18000000,
    area: 3,
    areaUnit: 'katha',
    location: { address: 'Sector 7, Road 5, Uttara', city: 'Dhaka', district: 'Dhaka', country: 'Bangladesh' },
    landType: 'residential',
    status: 'for_sale',
    features: { roadAccess: true, electricity: true, water: true, gas: true, wallBoundary: true, cornerPlot: true, floodZone: false, facingDirection: 'north-east', roadWidth: 25 },
    isFeatured: true,
    tags: ['uttara', 'corner plot', 'airport road', 'metro', 'residential'],
    aiAnalysis: {
      overallScore: 87, investmentScore: 89, riskScore: 18,
      summary: 'Excellent corner residential plot in Uttara with strong infrastructure. Metro extension nearby will drive significant price appreciation in the next 3 years.',
      riskFactors: [{ factor: 'Construction noise', severity: 'low', description: 'Temporary disruption from nearby metro construction' }],
      priceProjection: { currentFairValue: 18000000, year1: 20700000, year2: 23805000, year3: 27375750, year4: 31482113, year5: 36204430 },
      annualAppreciation: 15, rentalYield: 5.1, constructionROI: 165,
      recommendations: ['Corner plots command 20-30% premium', 'Build residential apartments for rental income'],
      bestUseCase: 'Premium residential apartment building',
      marketTrend: 'bullish', liquidityScore: 88, verdict: 'buy', analyzedAt: new Date(),
    },
    views: 985, inquiries: 15,
  },
];

// ─── Seed Function ──────────────────────────────────────────
async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing demo data (keep real user data)
    const existingAdmin = await User.findOne({ role: 'admin' });

    // Seed users
    console.log('👤 Seeding users...');
    for (const userData of demoUsers) {
      const exists = await User.findOne({ email: userData.email });
      if (!exists) {
        const hashed = await bcrypt.hash(userData.password, 12);
        await User.create({ ...userData, password: hashed, isVerified: true });
        console.log(`  ✅ Created user: ${userData.email}`);
      } else {
        console.log(`  ⏭️  User exists: ${userData.email}`);
      }
    }

    // Get admin user for ownership
    const adminUser = await User.findOne({ role: 'admin' });
    const agentUser = await User.findOne({ email: 'nasreen@demo.com' });

    // Seed listings
    console.log('\n🏡 Seeding listings...');
    for (const listing of demoListings) {
      const exists = await Land.findOne({ slug: listing.slug });
      if (!exists) {
        await Land.create({
          ...listing,
          pricePerSqft: Math.round(listing.price / listing.area),
          owner: agentUser?._id || adminUser?._id,
          metaTitle: listing.title,
          metaDescription: listing.description.substring(0, 160),
        });
        console.log(`  ✅ Created listing: ${listing.title}`);
      } else {
        console.log(`  ⏭️  Listing exists: ${listing.title}`);
      }
    }

    console.log('\n🎉 Seed complete!');
    console.log('\n📋 Demo Credentials:');
    console.log('  Admin:  admin@landiq.com / Admin@123456');
    console.log('  Pro:    rafiq@demo.com  / Demo@123456');
    console.log('  Agent:  nasreen@demo.com / Demo@123456');

  } catch (err) {
    console.error('❌ Seed error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

seed();
