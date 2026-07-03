import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import db from '../../db/database';
import { useSync } from '../../contexts/SyncContext';
import { useToast } from '../../contexts/ToastContext';
import { Search, Plus, Edit3, Trash2, X, Save, Tags } from 'lucide-react';

export default function CategoriesPage() {
  const { pushToOutbox } = useSync();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', icon: '', order: 0 });

  const categories = useLiveQuery(() => db.categories.orderBy('order').toArray(), []);

  const filtered = categories?.filter(c => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q);
  }) || [];

  const openForm = (category = null) => {
    if (category) {
      setEditCategory(category);
      setFormData({ name: category.name, icon: category.icon || '', order: category.order || 0 });
    } else {
      setEditCategory(null);
      const nextOrder = categories?.length ? Math.max(...categories.map(c => c.order)) + 1 : 0;
      setFormData({ name: '', icon: '', order: nextOrder });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.warning('Category name is required');
      return;
    }
    const data = {
      id: editCategory?.id || uuidv4(),
      name: formData.name,
      icon: formData.icon,
      order: parseInt(formData.order) || 0,
      isActive: true,
      syncStatus: 'pending',
    };
    await db.categories.put(data);
    await pushToOutbox('category', data.id, editCategory ? 'update' : 'create', data);
    toast.success(editCategory ? 'Category updated' : 'Category added');
    setShowForm(false);
  };

  const handleDelete = async (category) => {
    // Check if products are using this category
    const productsInCat = await db.products.where('category').equals(category.name).count();
    if (productsInCat > 0) {
      toast.error(`Cannot delete! ${productsInCat} product(s) are using this category.`);
      return;
    }
    if (!confirm(`Delete category "${category.name}"?`)) return;
    
    await db.categories.delete(category.id);
    await pushToOutbox('category', category.id, 'delete', { id: category.id });
    toast.success('Category deleted');
  };

  return (
    <div style={{ padding: 28, maxWidth: 1000, margin: '0 auto' }} className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>Categories</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Organize products into navigable groups for the POS.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openForm()}>
          <Plus size={18} /> Add Category
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
        <input
          className="input"
          placeholder="Search categories..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 42, maxWidth: 400 }}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: 60, textAlign: 'center' }}>Icon</th>
              <th>Category Name</th>
              <th style={{ width: 100, textAlign: 'center' }}>Sort Order</th>
              <th style={{ width: 100, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                  <Tags size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                  <div>No categories found</div>
                </td>
              </tr>
            ) : (
              filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ textAlign: 'center', fontSize: 18 }}>{c.icon}</td>
                  <td style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</td>
                  <td style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>{c.order}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button className="btn btn-ghost btn-icon" onClick={() => openForm(c)} style={{ minWidth: 32, minHeight: 32, padding: 0 }}>
                        <Edit3 size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(c)} style={{ minWidth: 32, minHeight: 32, padding: 0, color: 'var(--color-danger)' }}>
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
          <div className="modal animate-scale-in" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, padding: 0 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{editCategory ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-icon" style={{ padding: 0, minHeight: 36, minWidth: 36 }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Category Name *</label>
                <input className="input" autoFocus value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Concrete" />
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Icon (Emoji)</label>
                  <input className="input" value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} placeholder="🧱" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Sort Order</label>
                  <input className="input" type="number" value={formData.order} onChange={e => setFormData({...formData, order: e.target.value})} />
                </div>
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
