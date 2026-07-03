import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import db from '../../db/database';
import { useSync } from '../../contexts/SyncContext';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/helpers';
import {
  Plus, Search, Edit3, Trash2, X, Save, Package, Filter, Image as ImageIcon, Upload, Printer
} from 'lucide-react';
import BarcodePrintModal from './BarcodePrintModal';

export default function ProductsPage() {
  const { pushToOutbox } = useSync();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [showBarcodePrint, setShowBarcodePrint] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', category: '', price: '', costPrice: '', stock: '', unit: 'piece', sku: '', barcode: '', image: '', supplierId: '',
  });

  const products = useLiveQuery(() => db.products.toArray(), []);
  const categories = useLiveQuery(() => db.categories.orderBy('order').toArray(), []);
  const suppliers = useLiveQuery(() => db.suppliers.orderBy('name').toArray(), []);

  const filtered = products?.filter(p => {
    const matchCat = filterCategory === 'All' || p.category === filterCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
    return matchCat && matchSearch;
  }) || [];

  const openForm = (product = null) => {
    if (product) {
      setEditProduct(product);
      setFormData({
        name: product.name,
        category: product.category,
        price: String(product.price),
        costPrice: String(product.costPrice),
        stock: String(product.stock),
        unit: product.unit,
        sku: product.sku,
        barcode: product.barcode || '',
        image: product.image || '',
        supplierId: product.supplierId || '',
      });
    } else {
      setEditProduct(null);
      setFormData({ name: '', category: categories?.[0]?.name || '', price: '', costPrice: '', stock: '', unit: 'piece', sku: '', barcode: '', image: '', supplierId: '' });
    }
    setShowForm(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setFormData(prev => ({ ...prev, image: dataUrl }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.stock) {
      toast.warning('Please fill in all required fields');
      return;
    }

    const data = {
      id: editProduct?.id || uuidv4(),
      name: formData.name,
      category: formData.category,
      price: parseFloat(formData.price),
      costPrice: parseFloat(formData.costPrice) || 0,
      stock: parseInt(formData.stock),
      unit: formData.unit,
      sku: formData.sku,
      barcode: formData.barcode,
      image: formData.image,
      supplierId: formData.supplierId,
      supplierName: suppliers?.find(s => s.id === formData.supplierId)?.name || '',
      isActive: true,
      createdAt: editProduct?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
    };

    await db.products.put(data);
    await pushToOutbox('product', data.id, editProduct ? 'update' : 'create', data);

    toast.success(editProduct ? 'Product updated' : 'Product added');
    setShowForm(false);
  };

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"?`)) return;
    await db.products.delete(product.id);
    await pushToOutbox('product', product.id, 'delete', { id: product.id });
    toast.success('Product deleted');
  };

  return (
    <div style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>Products</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            {products?.length || 0} products in inventory
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openForm()}>
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            className="input"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 42 }}
          />
        </div>
        <select
          className="input"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          style={{ width: 200 }}
        >
          <option value="All">All Categories</option>
          {categories?.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      {/* Products Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: 48 }}>Img</th>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th style={{ textAlign: 'right' }}>Cost</th>
              <th style={{ textAlign: 'right' }}>Stock</th>
              <th>Unit</th>
              <th>Barcode</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                  <Package size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                  <div>No products found</div>
                </td>
              </tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    {p.image ? (
                      <img src={p.image} alt={p.name} style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                        <ImageIcon size={14} />
                      </div>
                    )}
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</td>
                  <td style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{p.sku}</td>
                  <td><span className="badge badge-info" style={{ fontSize: 11 }}>{p.category}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(p.price)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>{formatCurrency(p.costPrice)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`badge ${p.stock <= 5 ? 'badge-danger' : p.stock <= 20 ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: 11 }}>
                      {p.stock}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{p.unit}</td>
                  <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{p.barcode || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button 
                        className="btn btn-ghost btn-icon" 
                        onClick={() => setShowBarcodePrint(p)} 
                        style={{ minWidth: 36, minHeight: 36, padding: 0 }}
                        title="Print Barcode Labels"
                      >
                        <Printer size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon" onClick={() => openForm(p)} style={{ minWidth: 36, minHeight: 36, padding: 0 }}>
                        <Edit3 size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => handleDelete(p)}
                        style={{ minWidth: 36, minHeight: 36, padding: 0, color: 'var(--color-danger)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="overlay" onClick={() => setShowForm(false)}>
          <div className="modal animate-scale-in" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, padding: 0 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{editProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-icon" style={{ minWidth: 36, minHeight: 36, padding: 0 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Image Upload */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8 }}>
                {formData.image ? (
                  <div style={{ position: 'relative', width: 80, height: 80 }}>
                    <img src={formData.image} alt="Preview" style={{ width: 80, height: 80, borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '1px solid var(--color-border)' }} />
                    <button onClick={() => setFormData({...formData, image: ''})} style={{ position: 'absolute', top: -8, right: -8, background: 'var(--color-danger)', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label style={{ width: 80, height: 80, borderRadius: 'var(--radius-md)', border: '2px dashed var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)', background: 'var(--color-bg-secondary)', transition: 'all 0.2s' }}>
                    <Upload size={20} style={{ marginBottom: 4 }} />
                    <span style={{ fontSize: 10, fontWeight: 600 }}>Upload</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                )}
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Product Image</h3>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Upload an image for the POS screen. Best size: 400x400px.</p>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Product Name *</label>
                <input className="input" placeholder="e.g. Portland Cement 50kg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Category</label>
                  <select className="input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    {categories?.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Supplier</label>
                  <select className="input" value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})}>
                    <option value="">None</option>
                    {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>SKU</label>
                  <input className="input" placeholder="e.g. CEM-001" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Selling Price (LKR) *</label>
                  <input className="input" type="number" placeholder="0.00" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Cost Price (LKR)</label>
                  <input className="input" type="number" placeholder="0.00" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Stock Quantity *</label>
                  <input className="input" type="number" placeholder="0" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Unit</label>
                  <select className="input" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                    {['piece', 'kg', 'bag', 'roll', 'rod', 'sheet', 'tin', 'bucket', 'pair', 'box', 'cube', 'm'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Barcode</label>
                  <input className="input" placeholder="Scan or type" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}>
                  <Save size={16} /> {editProduct ? 'Update' : 'Add'} Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Print Modal */}
      {showBarcodePrint && (
        <BarcodePrintModal 
          product={showBarcodePrint} 
          onClose={() => setShowBarcodePrint(null)} 
        />
      )}
    </div>
  );
}
