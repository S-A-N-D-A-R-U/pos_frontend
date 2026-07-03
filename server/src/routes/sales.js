import { Router } from 'express';
import Sale from '../models/Sale.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/sales
router.get('/', authenticate, async (req, res) => {
  try {
    const { from, to, limit = 50 } = req.query;
    const query = {};
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }
    const sales = await Sale.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sales
router.post('/', authenticate, async (req, res) => {
  try {
    const sale = new Sale({ _id: req.body.id, ...req.body });
    await sale.save();
    res.status(201).json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
