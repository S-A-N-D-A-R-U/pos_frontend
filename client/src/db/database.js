import Dexie from 'dexie';

const db = new Dexie('BuildPOS');

db.version(1).stores({
  products: 'id, name, category, barcode, sku, price, updatedAt, syncStatus',
  categories: 'id, name, order',
  sales: 'id, createdAt, cashierId, cashierName, status, total, paymentMethod, syncStatus, [createdAt+cashierId]',
  saleItems: 'id, saleId, productId, productName',
  heldOrders: 'id, createdAt, cashierId, label',
  syncOutbox: '++id, entity, entityId, operation, createdAt, status',
  authCache: 'id',
  settings: 'key'
});

db.version(2).stores({
  authCache: 'id, username'
});

db.version(3).stores({
  products: 'id, name, category, barcode, sku, price, updatedAt, syncStatus, isActive'
});

db.version(4).stores({
  customers: 'id, name, phone, syncStatus',
  customerPayments: 'id, customerId, saleId, syncStatus'
});

db.version(5).stores({
  categories: 'id, name, order, syncStatus, isActive',
  suppliers: 'id, name, syncStatus',
  products: 'id, name, category, barcode, sku, price, updatedAt, syncStatus, isActive, supplierId'
});

db.version(6).stores({
  zReports: 'id, cashierId, closedAt, syncStatus'
});

export default db;
