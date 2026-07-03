import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  _id: { type: String },
  name: { type: String, required: true },
  icon: { type: String },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Category', categorySchema);
