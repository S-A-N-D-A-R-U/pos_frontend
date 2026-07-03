import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  _id: { type: String },
  name: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Customer', customerSchema);
