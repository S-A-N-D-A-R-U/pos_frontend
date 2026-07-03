import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import db from '../../db/database';
import { useSync } from '../../contexts/SyncContext';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { Search, Plus, Edit3, Trash2, X, Save, Users, CreditCard, ChevronRight } from 'lucide-react';

export default function CustomersPage() {
  const { pushToOutbox, user } = useSync();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  
  // Credit settlement state
  const [settleCustomer, setSettleCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const allCustomers = useLiveQuery(() => db.customers.toArray(), []);
  const allSales = useLiveQuery(() => db.sales.toArray(), []);

  // Compute stats per customer dynamically based on sales (strict invoice tracking)
  const customersWithStats = allCustomers?.map(c => {
    const customerSales = allSales?.filter(s => s.customerId === c.id) || [];
    const totalPurchases = customerSales.reduce((sum, s) => sum + s.total, 0);
    const balanceDue = customerSales.reduce((sum, s) => sum + (s.balanceDue || 0), 0);
    return { ...c, totalPurchases, balanceDue, unpaidSales: customerSales.filter(s => s.balanceDue > 0) };
  }) || [];

  const filtered = customersWithStats.filter(c => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q);
  });

  const openForm = (customer = null) => {
    if (customer) {
      setEditCustomer(customer);
      setFormData({ name: customer.name, phone: customer.phone || '', address: customer.address || '' });
    } else {
      setEditCustomer(null);
      setFormData({ name: '', phone: '', address: '' });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.warning('Name is required');
      return;
    }
    const data = {
      id: editCustomer?.id || uuidv4(),
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      isActive: true,
      createdAt: editCustomer?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
    };
    await db.customers.put(data);
    await pushToOutbox('customer', data.id, editCustomer ? 'update' : 'create', data);
    toast.success(editCustomer ? 'Customer updated' : 'Customer added');
    setShowForm(false);
  };

  const handleDelete = async (customer) => {
    if (customer.balanceDue > 0) {
      toast.error('Cannot delete a customer with an outstanding balance.');
      return;
    }
    if (!confirm(`Delete customer "${customer.name}"?`)) return;
    await db.customers.delete(customer.id);
    await pushToOutbox('customer', customer.id, 'delete', { id: customer.id });
    toast.success('Customer deleted');
  };

  const handleSettle = async () => {
    let amountToApply = parseFloat(paymentAmount);
    if (!amountToApply || amountToApply <= 0) return;

    if (amountToApply > settleCustomer.balanceDue) {
      toast.warning('Payment amount exceeds total balance due.');
      return;
    }

    // Process oldest invoices first
    const sortedInvoices = [...settleCustomer.unpaidSales].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    for (const sale of sortedInvoices) {
      if (amountToApply <= 0) break;
      
      const paymentForThisSale = Math.min(amountToApply, sale.balanceDue);
      amountToApply -= paymentForThisSale;

      // Update sale
      const updatedBalance = sale.balanceDue - paymentForThisSale;
      const updatedPaid = (sale.amountPaid || 0) + paymentForThisSale;
      
      const updatedSale = {
        ...sale,
        amountPaid: updatedPaid,
        balanceDue: updatedBalance,
        paymentStatus: updatedBalance <= 0 ? 'paid' : 'partial',
        syncStatus: 'pending',
      };
      await db.sales.put(updatedSale);
      await pushToOutbox('sale', sale.id, 'update', updatedSale);

      // Record payment
      const paymentId = uuidv4();
      const paymentRecord = {
        id: paymentId,
        customerId: settleCustomer.id,
        saleId: sale.id,
        amount: paymentForThisSale,
        paymentMethod: 'cash',
        cashierId: user?.id || 'system',
        createdAt: new Date().toISOString(),
        syncStatus: 'pending'
      };
      await db.customerPayments.put(paymentRecord);
      await pushToOutbox('customerPayment', paymentId, 'create', paymentRecord);
    }

    toast.success('Payment applied successfully');
    setSettleCustomer(null);
    setPaymentAmount('');
  };

  return (
    <div style={{ padding: 28, maxWidth: 1200, margin: '0 auto' }} className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>Customers</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Manage walk-in clients, accounts, and credit balances.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openForm()}>
          <Plus size={18} /> Add Customer
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
        <input
          className="input"
          placeholder="Search by name or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 42, maxWidth: 400 }}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Phone</th>
              <th style={{ textAlign: 'right' }}>Total Purchases</th>
              <th style={{ textAlign: 'right' }}>Credit Balance</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                  <Users size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                  <div>No customers found</div>
                </td>
              </tr>
            ) : (
              filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</td>
                  <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{c.phone || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(c.totalPurchases)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {c.balanceDue > 0 ? (
                      <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>
                        {formatCurrency(c.balanceDue)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>0.00</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      {c.balanceDue > 0 && (
                        <button className="btn btn-ghost" onClick={() => setSettleCustomer(c)} style={{ fontSize: 12, padding: '4px 8px', minHeight: 32, color: 'var(--color-success)' }}>
                          <CreditCard size={14} /> Settle
                        </button>
                      )}
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

      {/* Customer Form Modal */}
      {showForm && (
        <div className="overlay" onClick={() => setShowForm(false)}>
          <div className="modal animate-scale-in" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, padding: 0 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{editCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-icon" style={{ padding: 0, minHeight: 36, minWidth: 36 }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Full Name *</label>
                <input className="input" autoFocus value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Phone Number</label>
                <input className="input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Address</label>
                <textarea className="input" rows={3} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}><Save size={16} /> Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settle Credit Modal */}
      {settleCustomer && (
        <div className="overlay" onClick={() => setSettleCustomer(null)}>
          <div className="modal animate-scale-in" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Settle Credit</h2>
              <button onClick={() => setSettleCustomer(null)} className="btn btn-ghost btn-icon" style={{ padding: 0, minHeight: 36, minWidth: 36 }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Customer</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{settleCustomer.name}</div>
              </div>
              
              <div style={{ background: 'var(--color-danger-light)', border: '1px solid rgba(239,68,68,0.2)', padding: 16, borderRadius: 'var(--radius-lg)', marginBottom: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>Total Outstanding Balance</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-danger)' }}>{formatCurrency(settleCustomer.balanceDue)}</div>
              </div>

              <div style={{ marginBottom: 24, maxHeight: 200, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>Unpaid Invoices</div>
                {settleCustomer.unpaidSales.map(sale => (
                  <div key={sale.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed var(--color-border)', fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{sale.receiptNumber}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{formatDate(sale.createdAt)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-danger)' }}>{formatCurrency(sale.balanceDue)}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Total: {formatCurrency(sale.total)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Payment Amount</label>
                <input 
                  className="input input-lg" 
                  type="number" 
                  placeholder="0.00" 
                  value={paymentAmount} 
                  onChange={e => setPaymentAmount(e.target.value)} 
                  autoFocus 
                  style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', marginBottom: 16 }}
                />
              </div>

              <button 
                className="btn btn-success btn-xl" 
                onClick={handleSettle}
                style={{ width: '100%' }}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
              >
                Apply Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
