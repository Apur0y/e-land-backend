import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  land: { type: mongoose.Schema.Types.ObjectId, ref: 'Land' },
  type: { 
    type: String, 
    enum: ['full_analysis', 'price_prediction', 'risk_assessment', 'comparison', 'roi_calculator'],
    required: true 
  },
  title: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed }, // Full AI report data
  properties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Land' }], // For comparison reports
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  aiModel: { type: String, default: 'gemini-1.5-flash' },
  creditsUsed: { type: Number, default: 1 },
}, { timestamps: true });

export default mongoose.model('Report', reportSchema);
