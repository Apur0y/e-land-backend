import mongoose, { Schema } from 'mongoose';
import { IReport } from '../types/models.js';

const reportSchema = new Schema<IReport>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    land: { type: Schema.Types.ObjectId, ref: 'Land' },
    type: {
      type: String,
      enum: ['full_analysis', 'price_prediction', 'risk_assessment', 'comparison', 'roi_calculator'],
      required: true,
    },
    title: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    properties: [{ type: Schema.Types.ObjectId, ref: 'Land' }],
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' as const },
    aiModel: { type: String, default: 'gemini-1.5-flash' },
    creditsUsed: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export default mongoose.model<IReport>('Report', reportSchema);
