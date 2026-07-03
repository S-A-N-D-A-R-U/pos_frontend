import { Router } from 'express';
import Sale from '../models/Sale.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = Router();

// GET /api/reports/summary
router.get('/summary', authenticate, adminOnly, async (req, res) => {
  try {
    const { from, to } = req.query;
    const match = { status: 'completed' };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const [summary] = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$total' },
        },
      },
    ]);

    const dailySales = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const categorySales = await Sale.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productName',
          qty: { $sum: '$items.qty' },
          revenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      summary: summary || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 },
      dailySales,
      topProducts: categorySales,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
