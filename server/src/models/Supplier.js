import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  _id: { type: String },
  name: { type: String, required: true },
  contactPerson: { type: String },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Supplier', supplierSchema);
