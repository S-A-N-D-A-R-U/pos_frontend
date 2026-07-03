import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = Router();

// GET /api/users
router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { id, name, username, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ _id: id, name, username, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ id: user._id, name: user.name, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const update = { name: req.body.name, username: req.body.username, role: req.body.role };
    if (req.body.password) {
      update.password = await bcrypt.hash(req.body.password, 10);
    }
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
