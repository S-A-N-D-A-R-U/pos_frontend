import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import db from '../../db/database';
import { useToast } from '../../contexts/ToastContext';
import {
  Plus, Edit3, Trash2, X, Save, Users as UsersIcon, Shield, ShoppingCart,
} from 'lucide-react';
import { hashPassword } from '../../utils/crypto';

export default function UsersPage() {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', username: '', password: '', role: 'cashier' });

  const users = useLiveQuery(() => db.authCache.toArray(), []);

  const openForm = (user = null) => {
    if (user) {
      setEditUser(user);
      setFormData({ name: user.name, username: user.username, password: '', role: user.role });
    } else {
      setEditUser(null);
      setFormData({ name: '', username: '', password: '', role: 'cashier' });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.username || (!editUser && !formData.password)) {
      toast.warning('Please fill in all required fields');
      return;
    }

    let finalPasswordHash = editUser?.passwordHash;
    if (formData.password) {
      finalPasswordHash = await hashPassword(formData.password);
    }

    const data = {
      id: editUser?.id || uuidv4(),
      name: formData.name,
      username: formData.username,
      passwordHash: finalPasswordHash,
      role: formData.role,
    };

    await db.authCache.put(data);
    toast.success(editUser ? 'User updated' : 'User added');
    setShowForm(false);
  };

  const handleDelete = async (user) => {
    if (user.username === 'admin') {
      toast.error('Cannot delete default admin');
      return;
    }
    if (!confirm(`Delete user "${user.name}"?`)) return;
    await db.authCache.delete(user.id);
    toast.success('User deleted');
  };

  const roleIcons = { admin: Shield, cashier: ShoppingCart };

  return (
    <div style={{ padding: 28, maxWidth: 900, margin: '0 auto' }} className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>Users</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Manage system users and roles
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openForm()}>
          <Plus size={18} /> Add User
        </button>
      </div>

      {/* User Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {users?.map(user => {
          const RoleIcon = roleIcons[user.role] || UsersIcon;
          return (
            <div key={user.id} className="card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-full)',
                  background: user.role === 'admin' ? 'var(--color-accent-light)' : 'var(--color-success-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 18,
                  color: user.role === 'admin' ? 'var(--color-accent)' : 'var(--color-success)',
                  flexShrink: 0,
                }}>
                  {user.name?.charAt(0)?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{user.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>@{user.username}</div>
                  <div style={{ marginTop: 8 }}>
                    <span className={`badge ${user.role === 'admin' ? 'badge-info' : 'badge-success'}`} style={{ fontSize: 11, textTransform: 'capitalize' }}>
                      <RoleIcon size={12} /> {user.role}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-icon" onClick={() => openForm(user)} style={{ minWidth: 34, minHeight: 34, padding: 0 }}>
                    <Edit3 size={14} />
                  </button>
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => handleDelete(user)}
                    style={{ minWidth: 34, minHeight: 34, padding: 0, color: user.username === 'admin' ? 'var(--color-text-muted)' : 'var(--color-danger)' }}
                    disabled={user.username === 'admin'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="overlay" onClick={() => setShowForm(false)}>
          <div className="modal animate-scale-in" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, padding: 0 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{editUser ? 'Edit User' : 'Add User'}</h2>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-icon" style={{ minWidth: 36, minHeight: 36, padding: 0 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Full Name *</label>
                <input className="input" placeholder="John Doe" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Username *</label>
                <input className="input" placeholder="johndoe" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Password {editUser ? '(leave blank to keep current)' : '*'}
                </label>
                <input className="input" type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Role *</label>
                <select className="input" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                  <option value="admin">Admin — Full access</option>
                  <option value="cashier">Cashier — POS only</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}>
                  <Save size={16} /> {editUser ? 'Update' : 'Add'} User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
