import { Router } from 'express';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import Customer from '../models/Customer.js';
import CustomerPayment from '../models/CustomerPayment.js';
import Category from '../models/Category.js';
import Supplier from '../models/Supplier.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// POST /api/sync/push — receive changes from client
router.post('/push', authenticate, async (req, res) => {
  try {
    const { changes } = req.body;
    if (!changes || !Array.isArray(changes)) {
      return res.status(400).json({ error: 'Invalid changes payload' });
    }

    const results = [];
    for (const change of changes) {
      try {
        if (change.entity === 'sale') {
          if (change.operation === 'create' || change.operation === 'update') {
            await Sale.findByIdAndUpdate(change.entityId, change.data, { upsert: true, new: true });
          } else if (change.operation === 'delete') {
            await Sale.findByIdAndDelete(change.entityId);
          }
          results.push({ id: change.id, status: 'ok' });
        } else if (change.entity === 'product') {
          if (change.operation === 'create' || change.operation === 'update') {
            await Product.findByIdAndUpdate(change.entityId, change.data, { upsert: true, new: true });
          } else if (change.operation === 'delete') {
            await Product.findByIdAndUpdate(change.entityId, { isActive: false }, { new: true });
          }
          results.push({ id: change.id, status: 'ok' });
        } else if (change.entity === 'customer') {
          if (change.operation === 'create' || change.operation === 'update') {
            await Customer.findByIdAndUpdate(change.entityId, change.data, { upsert: true, new: true });
          } else if (change.operation === 'delete') {
            await Customer.findByIdAndUpdate(change.entityId, { isActive: false }, { new: true });
          }
          results.push({ id: change.id, status: 'ok' });
        } else if (change.entity === 'customerPayment') {
          if (change.operation === 'create') {
            await CustomerPayment.findByIdAndUpdate(change.entityId, change.data, { upsert: true, new: true });
          }
          results.push({ id: change.id, status: 'ok' });
        } else if (change.entity === 'category') {
          if (change.operation === 'create' || change.operation === 'update') {
            await Category.findByIdAndUpdate(change.entityId, change.data, { upsert: true, new: true });
          } else if (change.operation === 'delete') {
            await Category.findByIdAndUpdate(change.entityId, { isActive: false }, { new: true });
          }
          results.push({ id: change.id, status: 'ok' });
        } else if (change.entity === 'supplier') {
          if (change.operation === 'create' || change.operation === 'update') {
            await Supplier.findByIdAndUpdate(change.entityId, change.data, { upsert: true, new: true });
          } else if (change.operation === 'delete') {
            await Supplier.findByIdAndUpdate(change.entityId, { isActive: false }, { new: true });
          }
          results.push({ id: change.id, status: 'ok' });
        }
      } catch (err) {
        results.push({ id: change.id, status: 'error', error: err.message });
      }
    }

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sync/pull — send latest data to client
router.get('/pull', authenticate, async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(0);

    const products = await Product.find({ updatedAt: { $gte: since } });
    // Map Mongoose docs to plain objects with `id` field for Dexie
    const mappedProducts = products.map(p => ({
      id: p._id,
      name: p.name,
      category: p.category,
      price: p.price,
      costPrice: p.costPrice,
      stock: p.stock,
      unit: p.unit,
      sku: p.sku,
      barcode: p.barcode,
      image: p.image,
      supplierId: p.supplierId,
      supplierName: p.supplierName,
      isActive: p.isActive,
      createdAt: p.createdAt?.toISOString(),
      updatedAt: p.updatedAt?.toISOString(),
      syncStatus: 'synced',
    }));

    const customers = await Customer.find({ updatedAt: { $gte: since } });
    const mappedCustomers = customers.map(c => ({
      id: c._id,
      name: c.name,
      phone: c.phone,
      address: c.address,
      isActive: c.isActive,
      createdAt: c.createdAt?.toISOString(),
      updatedAt: c.updatedAt?.toISOString(),
      syncStatus: 'synced',
    }));

    const categoriesRaw = await Category.find({ updatedAt: { $gte: since } });
    const mappedCategories = categoriesRaw.map(c => ({
      id: c._id,
      name: c.name,
      icon: c.icon,
      order: c.order,
      isActive: c.isActive,
      createdAt: c.createdAt?.toISOString(),
      updatedAt: c.updatedAt?.toISOString(),
      syncStatus: 'synced',
    }));

    const suppliersRaw = await Supplier.find({ updatedAt: { $gte: since } });
    const mappedSuppliers = suppliersRaw.map(s => ({
      id: s._id,
      name: s.name,
      contactPerson: s.contactPerson,
      phone: s.phone,
      email: s.email,
      address: s.address,
      isActive: s.isActive,
      createdAt: s.createdAt?.toISOString(),
      updatedAt: s.updatedAt?.toISOString(),
      syncStatus: 'synced',
    }));

    const salesRaw = await Sale.find({ updatedAt: { $gte: since } });
    const mappedSales = salesRaw.map(s => ({
      id: s._id,
      receiptNumber: s.receiptNumber,
      cashierId: s.cashierId,
      cashierName: s.cashierName,
      items: s.items?.map(i => ({
        productId: i.productId,
        productName: i.productName,
        price: i.price,
        qty: i.qty,
        subtotal: i.subtotal
      })) || [],
      subtotal: s.subtotal,
      taxRate: s.taxRate,
      taxAmount: s.taxAmount,
      total: s.total,
      paymentMethod: s.paymentMethod,
      amountPaid: s.amountPaid,
      change: s.change,
      customerId: s.customerId,
      customerName: s.customerName,
      paymentStatus: s.paymentStatus,
      balanceDue: s.balanceDue,
      status: s.status,
      createdAt: s.createdAt?.toISOString(),
      updatedAt: s.updatedAt?.toISOString(),
      syncStatus: 'synced',
    }));

    const paymentsRaw = await CustomerPayment.find({ updatedAt: { $gte: since } });
    const mappedPayments = paymentsRaw.map(p => ({
      id: p._id,
      customerId: p.customerId,
      saleId: p.saleId,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      notes: p.notes,
      createdAt: p.createdAt?.toISOString(),
      updatedAt: p.updatedAt?.toISOString(),
      syncStatus: 'synced',
    }));

    res.json({
      products: mappedProducts,
      categories: mappedCategories,
      customers: mappedCustomers,
      suppliers: mappedSuppliers,
      sales: mappedSales,
      customerPayments: mappedPayments,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
