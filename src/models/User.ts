import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types/models.js';

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    phone: { type: String, trim: true },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['user', 'agent', 'admin'], default: 'user' as const },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' as const },
    planExpiry: { type: Date },
    aiCreditsUsed: { type: Number, default: 0 },
    aiCreditsLimit: { type: Number, default: 10 },
    savedProperties: [{ type: Schema.Types.ObjectId, ref: 'Land' }],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete (obj as any).password;
  delete (obj as any).resetPasswordToken;
  delete (obj as any).resetPasswordExpire;
  return obj;
};

export default mongoose.model<IUser>('User', userSchema);
