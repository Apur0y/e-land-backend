import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Land from './models/Land.js';

dotenv.config();

interface DemoUser {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'agent' | 'admin';
  plan: 'free' | 'pro' | 'enterprise';
  aiCreditsLimit: number;
}

interface DemoListing {
  title: string;
  slug: string;
  description: string;
  price: number;
  area: number;
  areaUnit: string;
  location: any;
  landType: string;
  status: string;
  features: any;
  isFeatured: boolean;
  tags: string[];
  aiAnalysis: any;
  views: number;
  inquiries: number;
}

const demoUsers: DemoUser[] = [
  {
    name: 'Admin User',
    email: process.env.ADMIN_EMAIL || 'admin@landiq.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123456',
    role: 'admin',
    plan: 'enterprise',
    aiCreditsLimit: 9999,
  },
  {
    name: 'Rafiqul Islam',
    email: 'rafiq@demo.com',
    password: 'Demo@123456',
    role: 'user',
    plan: 'pro',
    aiCreditsLimit: 100,
  },
  {
    name: 'Nasreen Ahmed',
    email: 'nasreen@demo.com',
    password: 'Demo@123456',
    role: 'agent',
    plan: 'pro',
    aiCreditsLimit: 100,
  },
  {
    name: 'Kamal Hossain',
    email: 'kamal@demo.com',
    password: 'Demo@123456',
    role: 'user',
    plan: 'free',
    aiCreditsLimit: 10,
  },
];

const demoListings: DemoListing[] = [
  {
    title: 'Prime Commercial Plot, Gulshan-2',
    slug: 'prime-commercial-plot-gulshan-2',
    description:
      'Exceptional commercial land in the heart of Gulshan-2, Dhaka. This prime location offers maximum visibility and footfall. Ideal for office buildings, retail developments, or mixed-use projects. The plot is surrounded by embassies, corporate offices, and high-end restaurants.',
    price: 45000000,
    area: 5,
    areaUnit: 'katha',
    location: { address: 'Road 12, Gulshan-2', city: 'Dhaka', district: 'Dhaka', country: 'Bangladesh' },
    landType: 'commercial',
    status: 'for_sale',
    features: {
      roadAccess: true,
      electricity: true,
      water: true,
      cornerPlot: true,
      floodZone: false,
      facingDirection: 'north',
      roadWidth: 40,
    },
    isFeatured: true,
    tags: ['gulshan', 'commercial', 'corner plot', 'prime location'],
    aiAnalysis: {
      overallScore: 92,
      investmentScore: 95,
      riskScore: 15,
      summary: "Exceptional commercial property in Dhaka's most prestigious business district. High appreciation potential with strong demand from multinational companies.",
      riskFactors: [{ factor: 'Traffic congestion', severity: 'low', description: 'Peak hour congestion may affect access' }],
      priceProjection: { year1: 51750000, year2: 59512500, year3: 68439375, year4: 78705281, year5: 90511073 },
      annualAppreciation: 15,
      rentalYield: 6.2,
      constructionROI: 180,
      recommendations: ['Ideal for Grade A office development', 'Consider mixed-use to maximize returns'],
      bestUseCase: 'Grade A commercial office tower or luxury mixed-use development',
      marketTrend: 'bullish',
      liquidityScore: 92,
      verdict: 'buy',
      analyzedAt: new Date(),
    },
    views: 1240,
    inquiries: 18,
  },
  {
    title: 'Residential Plot Near Bashundhara City',
    slug: 'residential-plot-bashundhara-city',
    description:
      "Well-located residential land in Bashundhara R/A, one of Dhaka's most sought-after residential neighborhoods. The area has all modern amenities and excellent infrastructure. Perfect for building your dream home or a residential apartment complex.",
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
      overallScore: 88,
      investmentScore: 85,
      riskScore: 20,
      summary: 'Premium residential land in Bashundhara R/A with excellent connectivity and modern amenities. Strong long-term appreciation expected.',
      riskFactors: [{ factor: 'Price premium', severity: 'low', description: 'Already priced at market premium' }],
      priceProjection: { year1: 35840000, year2: 40140800, year3: 44957696, year4: 50352619, year5: 56394934 },
      annualAppreciation: 12,
      rentalYield: 4.8,
      constructionROI: 140,
      recommendations: ['Build 6-storey apartment for maximum ROI', 'Current market favors residential development'],
      bestUseCase: 'Luxury residential apartment building',
      marketTrend: 'bullish',
      liquidityScore: 85,
      verdict: 'buy',
      analyzedAt: new Date(),
    },
    views: 892,
    inquiries: 11,
  },
  {
    title: "Beachfront Plot, Cox's Bazar",
    slug: 'beachfront-plot-coxs-bazar',
    description:
      "Rare beachfront land in Cox's Bazar, the world's longest natural sea beach. Located just 200 meters from the beach with unobstructed sea views. Perfect for a boutique hotel, resort, or high-end guesthouse. Tourism growth in the area makes this an exceptional investment.",
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
      overallScore: 95,
      investmentScore: 98,
      riskScore: 12,
      summary: "Exceptional beachfront land in Bangladesh's premier tourism destination. Irreplaceable location with massive upside as Cox's Bazar tourism industry expands with the new airport and expressway.",
      riskFactors: [{ factor: 'Cyclone risk', severity: 'low', description: 'Structural engineering required for coastal resilience' }],
      priceProjection: { year1: 72000000, year2: 86400000, year3: 103680000, year4: 124416000, year5: 149299200 },
      annualAppreciation: 20,
      rentalYield: 8.5,
      constructionROI: 220,
      recommendations: ['Build boutique hotel immediately', 'Apply for tourism investment incentives', 'Partner with hotel chains'],
      bestUseCase: '4-star boutique beach hotel or luxury resort',
      marketTrend: 'bullish',
      liquidityScore: 88,
      verdict: 'buy',
      analyzedAt: new Date(),
    },
    views: 2180,
    inquiries: 34,
  },
  {
    title: 'Corner Residential Plot, Uttara Sector 7',
    slug: 'corner-residential-plot-uttara-sector-7',
    description:
      'Coveted corner plot in Uttara Sector 7, close to Hazrat Shahjalal International Airport and the upcoming Metrorail extension. The location offers easy access to both old and new Dhaka via the airport road and BRT.',
    price: 18000000,
    area: 3,
    areaUnit: 'katha',
    location: { address: 'Sector 7, Road 5, Uttara', city: 'Dhaka', district: 'Dhaka', country: 'Bangladesh' },
    landType: 'residential',
    status: 'for_sale',
    features: {
      roadAccess: true,
      electricity: true,
      water: true,
      gas: true,
      wallBoundary: true,
      cornerPlot: true,
      floodZone: false,
      facingDirection: 'north-east',
      roadWidth: 25,
    },
    isFeatured: true,
    tags: ['uttara', 'corner plot', 'airport road', 'metro', 'residential'],
    aiAnalysis: {
      overallScore: 87,
      investmentScore: 89,
      riskScore: 18,
      summary: 'Excellent corner residential plot in Uttara with strong infrastructure. Metro extension nearby will drive significant price appreciation in the next 3 years.',
      riskFactors: [{ factor: 'Construction noise', severity: 'low', description: 'Temporary disruption from nearby metro construction' }],
      priceProjection: { year1: 20700000, year2: 23805000, year3: 27375750, year4: 31482113, year5: 36204430 },
      annualAppreciation: 15,
      rentalYield: 5.1,
      constructionROI: 165,
      recommendations: ['Corner plots command 20-30% premium', 'Build residential apartments for rental income'],
      bestUseCase: 'Premium residential apartment building',
      marketTrend: 'bullish',
      liquidityScore: 88,
      verdict: 'buy',
      analyzedAt: new Date(),
    },
    views: 985,
    inquiries: 15,
  },
];

async function seed(): Promise<void> {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

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
    if (err instanceof Error) {
      console.error('❌ Seed error:', err.message);
    } else {
      console.error('❌ Seed error:', err);
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

seed();
