import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  _id: { type: String },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'cashier'], default: 'cashier' },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
