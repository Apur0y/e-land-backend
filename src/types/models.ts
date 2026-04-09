import { Document, Types } from 'mongoose';

// User Types
export interface IUserBase {
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'user' | 'agent' | 'admin';
  isVerified: boolean;
  isActive: boolean;
  plan: 'free' | 'pro' | 'enterprise';
  planExpiry?: Date;
  aiCreditsUsed: number;
  aiCreditsLimit: number;
  savedProperties: Types.ObjectId[];
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  lastLogin?: Date;
}

export interface IUser extends IUserBase, Document {
  password: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Land Types
export interface ILocation {
  address: string;
  city: string;
  district: string;
  state?: string;
  country: string;
  zipCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface IFeatures {
  roadAccess: boolean;
  electricity: boolean;
  water: boolean;
  gas: boolean;
  drainage: boolean;
  wallBoundary: boolean;
  cornerPlot: boolean;
  facingDirection?: 'north' | 'south' | 'east' | 'west' | 'north-east' | 'north-west' | 'south-east' | 'south-west';
  roadWidth?: number;
  floodZone: boolean;
  nearGovtProject: boolean;
}

export interface IImage {
  url: string;
  caption?: string;
  isPrimary: boolean;
}

export interface IDocument {
  name: string;
  url: string;
  type: 'deed' | 'survey' | 'tax' | 'other';
}

export interface IRiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface IPriceProjection {
  year1: number;
  year2: number;
  year3: number;
  year4: number;
  year5: number;
}

export interface IAIAnalysis {
  overallScore: number;
  investmentScore: number;
  riskScore: number;
  summary: string;
  riskFactors: IRiskFactor[];
  priceProjection: IPriceProjection;
  rentalYield?: number;
  constructionROI?: number;
  recommendations: string[];
  analyzedAt: Date;
}

export interface ILandBase {
  title: string;
  slug: string;
  description: string;
  price: number;
  pricePerSqft?: number;
  area: number;
  areaUnit: 'sqft' | 'sqm' | 'acre' | 'hectare' | 'katha' | 'bigha' | 'decimal';
  location: ILocation;
  landType: 'residential' | 'commercial' | 'agricultural' | 'industrial' | 'mixed' | 'plot';
  status: 'for_sale' | 'for_lease' | 'sold' | 'leased' | 'off_market';
  features: IFeatures;
  images: IImage[];
  documents: IDocument[];
  aiAnalysis?: IAIAnalysis;
  owner: Types.ObjectId;
  agent?: Types.ObjectId;
  views: number;
  inquiries: number;
  isFeatured: boolean;
  isVerified: boolean;
  isActive: boolean;
  tags: string[];
  metaTitle?: string;
  metaDescription?: string;
}

export interface ILand extends ILandBase, Document {
  createdAt: Date;
  updatedAt: Date;
}

// Inquiry Types
export interface IInquiryBase {
  land: Types.ObjectId;
  user?: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  message: string;
  type: 'buy' | 'lease' | 'info' | 'visit';
  status: 'new' | 'contacted' | 'closed';
  budget?: number;
  notes?: string;
}

export interface IInquiry extends IInquiryBase, Document {
  createdAt: Date;
  updatedAt: Date;
}

// Report Types
export interface IReportBase {
  user: Types.ObjectId;
  land?: Types.ObjectId;
  type: 'full_analysis' | 'price_prediction' | 'risk_assessment' | 'comparison' | 'roi_calculator';
  title: string;
  data: any;
  properties: Types.ObjectId[];
  status: 'pending' | 'completed' | 'failed';
  aiModel: string;
  creditsUsed: number;
}

export interface IReport extends IReportBase, Document {
  createdAt: Date;
  updatedAt: Date;
}

// Common Response Types
export interface IApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface IPaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
