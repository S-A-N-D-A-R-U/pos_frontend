import mongoose from 'mongoose';

const customerPaymentSchema = new mongoose.Schema({
  _id: { type: String },
  customerId: { type: String, required: true },
  saleId: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'bank_transfer'], default: 'cash' },
  cashierId: { type: String },
}, { timestamps: true });

export default mongoose.model('CustomerPayment', customerPaymentSchema);
