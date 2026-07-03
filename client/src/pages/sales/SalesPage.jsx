import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../../db/database';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { Search, Calendar, FileText, Filter } from 'lucide-react';

export default function SalesPage() {
  const [search, setSearch] = useState('');
  
  // Default to today
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [statusFilter, setStatusFilter] = useState('all');

  const allSales = useLiveQuery(() => db.sales.orderBy('createdAt').reverse().toArray(), []);

  const filteredSales = useMemo(() => {
    if (!allSales) return [];
    
    // Create Date objects for midnight to midnight comparison
    const start = startDate ? new Date(startDate) : new Date(0);
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    return allSales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      const matchesDate = saleDate >= start && saleDate <= end;
      
      const q = search.toLowerCase();
      const matchesSearch = !q || 
        sale.receiptNumber?.toLowerCase().includes(q) || 
        sale.customerName?.toLowerCase().includes(q) ||
        sale.cashierName?.toLowerCase().includes(q);
        
      const matchesStatus = statusFilter === 'all' || sale.paymentStatus === statusFilter || sale.status === statusFilter;
      
      return matchesDate && matchesSearch && matchesStatus;
    });
  }, [allSales, startDate, endDate, search, statusFilter]);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const totalReceived = filteredSales.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
  const totalOutstanding = filteredSales.reduce((sum, s) => sum + (s.balanceDue || 0), 0);

  return (
    <div style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }} className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>Sales History</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            View and filter past transactions and receipts.
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Total Sales Value</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)' }}>{formatCurrency(totalRevenue)}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{filteredSales.length} transactions</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Total Collected</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-success)' }}>{formatCurrency(totalReceived)}</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Total Outstanding (Credit)</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-danger)' }}>{formatCurrency(totalOutstanding)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 16, marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            className="input"
            placeholder="Search receipt, customer, or cashier..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 42, width: '100%' }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={16} style={{ color: 'var(--color-text-muted)' }} />
          <input 
            type="date" 
            className="input" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
          />
          <span style={{ color: 'var(--color-text-muted)' }}>to</span>
          <input 
            type="date" 
            className="input" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)} 
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} style={{ color: 'var(--color-text-muted)' }} />
          <select 
            className="input" 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="paid">Fully Paid</option>
            <option value="partial">Partially Paid</option>
            <option value="unpaid">Unpaid / Credit</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Receipt / Date</th>
              <th>Customer</th>
              <th>Cashier</th>
              <th>Payment Method</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ textAlign: 'right' }}>Balance Due</th>
              <th style={{ textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
                  <FileText size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No sales found</div>
                  <div style={{ fontSize: 13 }}>Try adjusting your date range or filters</div>
                </td>
              </tr>
            ) : (
              filteredSales.map(sale => (
                <tr key={sale.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{sale.receiptNumber}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{formatDateTime(sale.createdAt)}</div>
                  </td>
                  <td style={{ fontSize: 13, fontWeight: 500 }}>{sale.customerName || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Walk-in</span>}</td>
                  <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{sale.cashierName}</td>
                  <td style={{ textTransform: 'uppercase', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{sale.paymentMethod}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(sale.total)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {sale.balanceDue > 0 ? (
                      <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{formatCurrency(sale.balanceDue)}</span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>0.00</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {sale.paymentStatus === 'unpaid' || sale.balanceDue === sale.total ? (
                      <span className="badge badge-danger">Unpaid</span>
                    ) : sale.paymentStatus === 'partial' || sale.balanceDue > 0 ? (
                      <span className="badge badge-warning">Partial</span>
                    ) : (
                      <span className="badge badge-success">Paid</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
