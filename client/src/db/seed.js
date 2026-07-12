import { v4 as uuidv4 } from 'uuid';
import db from './database';
import { hashPassword } from '../utils/crypto';

const CATEGORIES = [
  { id: uuidv4(), name: 'Cement & Binding', order: 1, icon: '🧱' },
  { id: uuidv4(), name: 'Steel & Iron', order: 2, icon: '🔩' },
  { id: uuidv4(), name: 'Plumbing & Pipes', order: 3, icon: '🔧' },
  { id: uuidv4(), name: 'Electrical', order: 4, icon: '⚡' },
  { id: uuidv4(), name: 'Paint & Finishing', order: 5, icon: '🎨' },
  { id: uuidv4(), name: 'Tools & Equipment', order: 6, icon: '🔨' },
  { id: uuidv4(), name: 'Timber & Wood', order: 7, icon: '🪵' },
  { id: uuidv4(), name: 'Roofing', order: 8, icon: '🏠' },
  { id: uuidv4(), name: 'Hardware & Fasteners', order: 9, icon: '⚙️' },
  { id: uuidv4(), name: 'Sand & Aggregates', order: 10, icon: '⛰️' },
];

function createProduct(name, category, price, costPrice, stock, unit, sku, barcode = '') {
  return {
    id: uuidv4(),
    name,
    category,
    price,
    costPrice,
    stock,
    unit,
    sku,
    barcode,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'synced',
  };
}

export async function seedDatabase() {
  const existingProducts = await db.products.count();
  if (existingProducts > 0) return false;

  const cats = CATEGORIES;
  await db.categories.bulkPut(cats);

  const products = [
    // Cement & Binding
    createProduct('Portland Cement 50kg', cats[0].name, 1950, 1750, 200, 'bag', 'CEM-001', '8901234560010'),
    createProduct('White Cement 1kg', cats[0].name, 180, 140, 150, 'kg', 'CEM-002', '8901234560027'),
    createProduct('Tile Adhesive 20kg', cats[0].name, 850, 700, 80, 'bag', 'CEM-003', '8901234560034'),
    createProduct('Wall Putty 40kg', cats[0].name, 1200, 980, 60, 'bag', 'CEM-004', '8901234560041'),
    createProduct('Waterproof Cement 50kg', cats[0].name, 2350, 2100, 50, 'bag', 'CEM-005', '8901234560058'),
    // Steel & Iron
    createProduct('TMT Steel Bar 10mm', cats[1].name, 850, 750, 500, 'rod', 'STL-001', '8901234560065'),
    createProduct('TMT Steel Bar 12mm', cats[1].name, 1100, 980, 400, 'rod', 'STL-002', '8901234560072'),
    createProduct('Binding Wire 1kg', cats[1].name, 120, 95, 300, 'kg', 'STL-003', '8901234560089'),
    createProduct('GI Wire 2mm', cats[1].name, 180, 140, 200, 'kg', 'STL-004', '8901234560096'),
    createProduct('MS Angle 25x25mm', cats[1].name, 650, 550, 100, 'piece', 'STL-005', '8901234560102'),
    // Plumbing & Pipes
    createProduct('PVC Pipe 1" (3m)', cats[2].name, 320, 260, 150, 'piece', 'PLB-001', '8901234560119'),
    createProduct('PVC Pipe 2" (3m)', cats[2].name, 580, 480, 120, 'piece', 'PLB-002', '8901234560126'),
    createProduct('CPVC Pipe 1/2" (3m)', cats[2].name, 420, 340, 100, 'piece', 'PLB-003', '8901234560133'),
    createProduct('PVC Elbow 1"', cats[2].name, 35, 22, 500, 'piece', 'PLB-004', '8901234560140'),
    createProduct('Ball Valve 1"', cats[2].name, 280, 200, 80, 'piece', 'PLB-005', '8901234560157'),
    // Electrical
    createProduct('Wire 1.5mm (90m)', cats[3].name, 2800, 2400, 50, 'roll', 'ELC-001', '8901234560164'),
    createProduct('Wire 2.5mm (90m)', cats[3].name, 4500, 3900, 40, 'roll', 'ELC-002', '8901234560171'),
    createProduct('Switch Board 6-way', cats[3].name, 350, 250, 60, 'piece', 'ELC-003', '8901234560188'),
    createProduct('MCB 32A', cats[3].name, 280, 200, 100, 'piece', 'ELC-004', '8901234560195'),
    createProduct('LED Bulb 12W', cats[3].name, 150, 90, 200, 'piece', 'ELC-005', '8901234560201'),
    // Paint & Finishing
    createProduct('Emulsion Paint 10L', cats[4].name, 3200, 2700, 30, 'bucket', 'PNT-001', '8901234560218'),
    createProduct('Primer 4L', cats[4].name, 1200, 950, 40, 'tin', 'PNT-002', '8901234560225'),
    createProduct('Enamel Paint 1L', cats[4].name, 450, 350, 80, 'tin', 'PNT-003', '8901234560232'),
    createProduct('Paint Brush 4"', cats[4].name, 180, 120, 100, 'piece', 'PNT-004', '8901234560249'),
    createProduct('Roller 9"', cats[4].name, 320, 220, 60, 'piece', 'PNT-005', '8901234560256'),
    // Tools & Equipment
    createProduct('Measuring Tape 5m', cats[5].name, 350, 250, 80, 'piece', 'TLS-001', '8901234560263'),
    createProduct('Spirit Level 24"', cats[5].name, 850, 650, 30, 'piece', 'TLS-002', '8901234560270'),
    createProduct('Mason Trowel', cats[5].name, 250, 160, 60, 'piece', 'TLS-003', '8901234560287'),
    createProduct('Wheelbarrow', cats[5].name, 4500, 3800, 15, 'piece', 'TLS-004', '8901234560294'),
    createProduct('Claw Hammer', cats[5].name, 550, 380, 40, 'piece', 'TLS-005', '8901234560300'),
    // Timber & Wood
    createProduct('Teak Wood 2x4 (8ft)', cats[6].name, 1800, 1500, 50, 'piece', 'TMB-001', '8901234560317'),
    createProduct('Plywood 8x4 (12mm)', cats[6].name, 2800, 2400, 30, 'sheet', 'TMB-002', '8901234560324'),
    createProduct('MDF Board 8x4 (18mm)', cats[6].name, 3200, 2800, 20, 'sheet', 'TMB-003', '8901234560331'),
    // Roofing
    createProduct('Asbestos Sheet 6ft', cats[7].name, 650, 520, 100, 'sheet', 'ROF-001', '8901234560348'),
    createProduct('Ridge Tile', cats[7].name, 180, 130, 200, 'piece', 'ROF-002', '8901234560355'),
    createProduct('Roofing Nail 3"', cats[7].name, 280, 200, 50, 'kg', 'ROF-003', '8901234560362'),
    // Hardware & Fasteners
    createProduct('Nail 2" (1kg)', cats[8].name, 180, 130, 200, 'kg', 'HDW-001', '8901234560379'),
    createProduct('Wood Screw 2" (100pc)', cats[8].name, 250, 170, 150, 'box', 'HDW-002', '8901234560386'),
    createProduct('Door Hinge 4" (pair)', cats[8].name, 180, 120, 200, 'pair', 'HDW-003', '8901234560393'),
    createProduct('Padlock 50mm', cats[8].name, 450, 320, 80, 'piece', 'HDW-004', '8901234560409'),
    createProduct('Tower Bolt 8"', cats[8].name, 160, 100, 120, 'piece', 'HDW-005', '8901234560416'),
    // Sand & Aggregates
    createProduct('River Sand (cube)', cats[9].name, 18000, 15000, 30, 'cube', 'SND-001', '8901234560423'),
    createProduct('Metal Aggregate 20mm', cats[9].name, 4500, 3800, 40, 'cube', 'SND-002', '8901234560430'),
    createProduct('Quarry Dust (cube)', cats[9].name, 5500, 4500, 25, 'cube', 'SND-003', '8901234560447'),
  ];

  await db.products.bulkPut(products);

  // Seed default settings
  await db.settings.bulkPut([
    { key: 'currency', value: 'LKR' },
    { key: 'currencySymbol', value: 'Rs.' },
    { key: 'taxRate', value: 0 },
    { key: 'storeName', value: 'BuildPOS Hardware' },
    { key: 'storeAddress', value: '' },
    { key: 'storePhone', value: '' },
    { key: 'receiptFooter', value: 'Thank you for your purchase!' },
    { key: 'lastSyncAt', value: null },
  ]);

  // Seed default admin user (for offline auth)
  const adminHash = await hashPassword('Admin@BuildPOS!');
  await db.authCache.put({
    id: 'default-admin',
    username: 'admin',
    passwordHash: adminHash,
    role: 'admin',
    name: 'Administrator',
  });

  const cashierHash = await hashPassword('cashier123');
  await db.authCache.put({
    id: 'default-cashier',
    username: 'cashier',
    passwordHash: cashierHash,
    role: 'cashier',
    name: 'Cashier 1',
  });

  return true;
}
