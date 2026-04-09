import mongoose, { Schema } from 'mongoose';
import { IInquiry } from '../types/models.js';

const inquirySchema = new Schema<IInquiry>(
  {
    land: { type: Schema.Types.ObjectId, ref: 'Land', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    message: { type: String, required: true },
    type: { type: String, enum: ['buy', 'lease', 'info', 'visit'], default: 'info' as const },
    status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new' as const },
    budget: { type: Number },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IInquiry>('Inquiry', inquirySchema);
