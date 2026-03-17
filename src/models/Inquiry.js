import mongoose from 'mongoose';

const inquirySchema = new mongoose.Schema({
  land: { type: mongoose.Schema.Types.ObjectId, ref: 'Land', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  message: { type: String, required: true },
  type: { type: String, enum: ['buy', 'lease', 'info', 'visit'], default: 'info' },
  status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new' },
  budget: { type: Number },
  notes: { type: String }, // Admin notes
}, { timestamps: true });

export default mongoose.model('Inquiry', inquirySchema);
