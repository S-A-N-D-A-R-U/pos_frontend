import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../../db/database';
import { formatCurrency, formatDate } from '../../utils/helpers';
import {
  Calendar, Download, TrendingUp, ShoppingCart, DollarSign,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  });

  const sales = useLiveQuery(() => db.sales.toArray(), []);
  const products = useLiveQuery(() => db.products.toArray(), []);

  const reportData = useMemo(() => {
    if (!sales || !products) return null;

    const startDate = new Date(dateRange.start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);

    const filtered = sales.filter(s => {
      const d = new Date(s.createdAt);
      return d >= startDate && d <= endDate && s.status === 'completed';
    });

    // Summary
    const totalRevenue = filtered.reduce((sum, s) => sum + s.total, 0);
    const totalOrders = filtered.length;
    const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Daily breakdown
    const dailyMap = {};
    const dayDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    for (let i = 0; i <= dayDiff; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = { date: key, label: formatDate(d.toISOString()), revenue: 0, orders: 0 };
    }
    filtered.forEach(s => {
      const key = new Date(s.createdAt).toISOString().slice(0, 10);
      if (dailyMap[key]) {
        dailyMap[key].revenue += s.total;
        dailyMap[key].orders += 1;
      }
    });
    const dailyData = Object.values(dailyMap);

    // Category breakdown
    const categoryMap = {};
    filtered.forEach(s => {
      s.items?.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const cat = prod?.category || 'Other';
        if (!categoryMap[cat]) categoryMap[cat] = { name: cat, value: 0 };
        categoryMap[cat].value += item.subtotal;
      });
    });
    const categoryData = Object.values(categoryMap).sort((a, b) => b.value - a.value);

    // Top products
    const productMap = {};
    filtered.forEach(s => {
      s.items?.forEach(item => {
        if (!productMap[item.productId]) {
          productMap[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
        }
        productMap[item.productId].qty += item.qty;
        productMap[item.productId].revenue += item.subtotal;
      });
    });
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Payment breakdown
    const cashSales = filtered.filter(s => s.paymentMethod === 'cash');
    const cardSales = filtered.filter(s => s.paymentMethod === 'card');
    const paymentData = [
      { name: 'Cash', value: cashSales.reduce((s, x) => s + x.total, 0) },
      { name: 'Card', value: cardSales.reduce((s, x) => s + x.total, 0) },
    ].filter(d => d.value > 0);

    return { totalRevenue, totalOrders, avgOrder, dailyData, categoryData, topProducts, paymentData };
  }, [sales, products, dateRange]);

  const exportCSV = () => {
    if (!sales) return;
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);

    const filtered = sales.filter(s => {
      const d = new Date(s.createdAt);
      return d >= startDate && d <= endDate && s.status === 'completed';
    });

    const rows = [['Receipt #', 'Date', 'Cashier', 'Items', 'Payment', 'Total']];
    filtered.forEach(s => {
      rows.push([
        s.receiptNumber,
        new Date(s.createdAt).toLocaleString(),
        s.cashierName || '',
        s.items?.length || 0,
        s.paymentMethod,
        s.total.toFixed(2),
      ]);
    });

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!reportData) {
    return (
      <div style={{ padding: 32 }}>
        <div className="skeleton" style={{ height: 32, width: 200, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 300, borderRadius: 14 }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>Reports</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Sales analytics & performance insights
          </p>
        </div>
        <button className="btn btn-secondary" onClick={exportCSV}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Date Filter */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Calendar size={18} style={{ color: 'var(--color-accent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            className="input"
            type="date"
            value={dateRange.start}
            onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
            style={{ width: 160 }}
          />
          <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>to</span>
          <input
            className="input"
            type="date"
            value={dateRange.end}
            onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
            style={{ width: 160 }}
          />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {[
            { label: '7D', days: 7 },
            { label: '30D', days: 30 },
            { label: '90D', days: 90 },
          ].map(preset => (
            <button
              key={preset.label}
              className="btn btn-ghost"
              onClick={() => {
                const end = new Date();
                const start = new Date();
                start.setDate(start.getDate() - preset.days);
                setDateRange({ start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) });
              }}
              style={{ fontSize: 12, padding: '6px 12px', minHeight: 32 }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <DollarSign size={18} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Total Revenue</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-accent)' }}>{formatCurrency(reportData.totalRevenue)}</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <ShoppingCart size={18} style={{ color: 'var(--color-success)' }} />
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Total Orders</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{reportData.totalOrders}</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <TrendingUp size={18} style={{ color: '#8b5cf6' }} />
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Avg Order Value</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{formatCurrency(reportData.avgOrder)}</div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Revenue Chart */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Revenue Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={reportData.dailyData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" hide={reportData.dailyData.length > 14} axisLine={false} tickLine={false} fontSize={11} />
              <YAxis axisLine={false} tickLine={false} fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13 }}
                formatter={(v) => [formatCurrency(v), 'Revenue']}
                labelFormatter={(l) => l}
              />
              <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Pie */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Sales by Category</h3>
          {reportData.categoryData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={reportData.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {reportData.categoryData.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 10, fontSize: 13 }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Top Selling Products</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th style={{ textAlign: 'right' }}>Qty Sold</th>
                <th style={{ textAlign: 'right' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {reportData.topProducts.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-muted)' }}>No sales in this period</td></tr>
              ) : (
                reportData.topProducts.map((p, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-muted)', width: 40 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</td>
                    <td style={{ textAlign: 'right', fontSize: 13 }}>{p.qty}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: 'var(--color-accent)' }}>{formatCurrency(p.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
