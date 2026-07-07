import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  _id: { type: String },
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  costPrice: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  unit: { type: String, default: 'piece' },
  sku: { type: String },
  barcode: { type: String },
  image: { type: String }, // Base64 data URL
  supplierId: { type: String },
  supplierName: { type: String },
  isActive: { type: Boolean, default: true },
  variations: [{
    id: { type: String },
    name: { type: String },
    price: { type: Number },
    stock: { type: Number, default: 0 },
    sku: { type: String },
    barcode: { type: String }
  }]
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
