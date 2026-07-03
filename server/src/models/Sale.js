import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  productId: String,
  productName: String,
  price: Number,
  qty: Number,
  subtotal: Number,
});

const saleSchema = new mongoose.Schema({
  _id: { type: String },
  receiptNumber: { type: String, required: true },
  cashierId: { type: String },
  cashierName: { type: String },
  items: [saleItemSchema],
  subtotal: { type: Number, required: true },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'credit', 'mixed'], required: true },
  amountPaid: { type: Number },
  change: { type: Number, default: 0 },
  customerId: { type: String },
  customerName: { type: String },
  paymentStatus: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'paid' },
  balanceDue: { type: Number, default: 0 },
  status: { type: String, default: 'completed' },
}, { timestamps: true });

export default mongoose.model('Sale', saleSchema);
