import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import db from '../../db/database';
import { useSync } from '../../contexts/SyncContext';
import { useToast } from '../../contexts/ToastContext';
import { Search, Plus, Edit3, Trash2, X, Save, Truck } from 'lucide-react';

export default function SuppliersPage() {
  const { pushToOutbox } = useSync();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [formData, setFormData] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '' });

  const suppliers = useLiveQuery(() => db.suppliers.toArray(), []);

  const filtered = suppliers?.filter(s => {
    const q = search.toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.contactPerson?.toLowerCase().includes(q);
  }) || [];

  const openForm = (supplier = null) => {
    if (supplier) {
      setEditSupplier(supplier);
      setFormData({
        name: supplier.name,
        contactPerson: supplier.contactPerson || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
      });
    } else {
      setEditSupplier(null);
      setFormData({ name: '', contactPerson: '', phone: '', email: '', address: '' });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.warning('Supplier Company Name is required');
      return;
    }
    const data = {
      id: editSupplier?.id || uuidv4(),
      name: formData.name,
      contactPerson: formData.contactPerson,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      isActive: true,
      syncStatus: 'pending',
    };
    await db.suppliers.put(data);
    await pushToOutbox('supplier', data.id, editSupplier ? 'update' : 'create', data);
    toast.success(editSupplier ? 'Supplier updated' : 'Supplier added');
    setShowForm(false);
  };

  const handleDelete = async (supplier) => {
    // Check if products are using this supplier
    const productsUsing = await db.products.where('supplierId').equals(supplier.id).count();
    if (productsUsing > 0) {
      toast.error(`Cannot delete! ${productsUsing} product(s) are linked to this supplier.`);
      return;
    }
    if (!confirm(`Delete supplier "${supplier.name}"?`)) return;
    
    await db.suppliers.delete(supplier.id);
    await pushToOutbox('supplier', supplier.id, 'delete', { id: supplier.id });
    toast.success('Supplier deleted');
  };

  return (
    <div style={{ padding: 28, maxWidth: 1200, margin: '0 auto' }} className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>Suppliers</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Manage vendors, distributors, and supply contacts.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openForm()}>
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
        <input
          className="input"
          placeholder="Search suppliers or contacts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 42, maxWidth: 400 }}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Contact Person</th>
              <th>Phone</th>
              <th>Email</th>
              <th style={{ width: 100, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                  <Truck size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                  <div>No suppliers found</div>
                </td>
              </tr>
            ) : (
              filtered.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</td>
                  <td style={{ fontSize: 13 }}>{s.contactPerson || '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{s.phone || '—'}</td>
                  <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{s.email || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button className="btn btn-ghost btn-icon" onClick={() => openForm(s)} style={{ minWidth: 32, minHeight: 32, padding: 0 }}>
                        <Edit3 size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(s)} style={{ minWidth: 32, minHeight: 32, padding: 0, color: 'var(--color-danger)' }}>
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

      {showForm && (
        <div className="overlay" onClick={() => setShowForm(false)}>
          <div className="modal animate-scale-in" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, padding: 0 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{editSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-icon" style={{ padding: 0, minHeight: 36, minWidth: 36 }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Company Name *</label>
                <input className="input" autoFocus value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Acme Construction Supplies" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Contact Person</label>
                  <input className="input" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Phone Number</label>
                  <input className="input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Email</label>
                <input className="input" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Address</label>
                <textarea className="input" rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}><Save size={16} /> Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
