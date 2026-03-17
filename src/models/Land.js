import mongoose from 'mongoose';

const landSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  pricePerSqft: { type: Number },
  area: { type: Number, required: true }, // in sqft
  areaUnit: { type: String, enum: ['sqft', 'sqm', 'acre', 'hectare', 'katha', 'bigha', 'decimal'], default: 'sqft' },
  
  location: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String, required: true },
    state: { type: String },
    country: { type: String, default: 'Bangladesh' },
    zipCode: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },

  landType: { 
    type: String, 
    enum: ['residential', 'commercial', 'agricultural', 'industrial', 'mixed', 'plot'],
    required: true 
  },
  
  status: { type: String, enum: ['for_sale', 'for_lease', 'sold', 'leased', 'off_market'], default: 'for_sale' },
  
  features: {
    roadAccess: { type: Boolean, default: false },
    electricity: { type: Boolean, default: false },
    water: { type: Boolean, default: false },
    gas: { type: Boolean, default: false },
    drainage: { type: Boolean, default: false },
    wallBoundary: { type: Boolean, default: false },
    cornerPlot: { type: Boolean, default: false },
    facingDirection: { type: String, enum: ['north', 'south', 'east', 'west', 'north-east', 'north-west', 'south-east', 'south-west'] },
    roadWidth: { type: Number }, // in feet
    floodZone: { type: Boolean, default: false },
    nearGovtProject: { type: Boolean, default: false },
  },
  
  images: [{ 
    url: { type: String },
    caption: { type: String },
    isPrimary: { type: Boolean, default: false }
  }],
  
  documents: [{
    name: { type: String },
    url: { type: String },
    type: { type: String, enum: ['deed', 'survey', 'tax', 'other'] }
  }],
  
  // AI Analysis stored
  aiAnalysis: {
    overallScore: { type: Number, min: 0, max: 100 },
    investmentScore: { type: Number, min: 0, max: 100 },
    riskScore: { type: Number, min: 0, max: 100 },
    summary: { type: String },
    riskFactors: [{ factor: String, severity: String, description: String }],
    priceProjection: {
      year1: Number,
      year2: Number,
      year3: Number,
      year4: Number,
      year5: Number,
    },
    rentalYield: { type: Number }, // percentage
    constructionROI: { type: Number }, // percentage
    recommendations: [String],
    analyzedAt: { type: Date },
  },
  
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  views: { type: Number, default: 0 },
  inquiries: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  
  tags: [String],
  
  metaTitle: { type: String },
  metaDescription: { type: String },
  
}, { timestamps: true });

landSchema.index({ 'location.city': 1, landType: 1, status: 1 });
landSchema.index({ price: 1 });
landSchema.index({ 'aiAnalysis.overallScore': -1 });

export default mongoose.model('Land', landSchema);
