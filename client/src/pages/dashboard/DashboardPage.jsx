import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../../db/database';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/helpers';
import { useSync } from '../../contexts/SyncContext';
import {
  DollarSign, ShoppingCart, TrendingUp, Package, ArrowUpRight, ArrowDownRight,
  BarChart3, Clock, AlertTriangle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts';

export default function DashboardPage() {
  const { isOnline } = useSync();

  const sales = useLiveQuery(() => db.sales.toArray(), []);
  const products = useLiveQuery(() => db.products.toArray(), []);

  const stats = useMemo(() => {
    if (!sales || !products) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = sales.filter(s => new Date(s.createdAt) >= today && s.status === 'completed');
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
    const todayOrders = todaySales.length;
    const avgOrderValue = todayOrders > 0 ? todayRevenue / todayOrders : 0;

    const lowStockProducts = products.filter(p => p.stock <= 5 && p.isActive !== false);

    // Last 7 days chart data
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const daySales = sales.filter(s => {
        const d = new Date(s.createdAt);
        return d >= date && d < nextDate && s.status === 'completed';
      });

      last7Days.push({
        day: date.toLocaleDateString('en-LK', { weekday: 'short' }),
        date: formatDate(date.toISOString()),
        revenue: daySales.reduce((sum, s) => sum + s.total, 0),
        orders: daySales.length,
      });
    }

    // Recent sales
    const recent = [...sales]
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);

    return {
      todayRevenue,
      todayOrders,
      avgOrderValue,
      totalProducts: products.length,
      lowStockProducts,
      last7Days,
      recentSales: recent,
    };
  }, [sales, products]);

  if (!stats) {
    return (
      <div style={{ padding: 32 }}>
        <div className="skeleton" style={{ height: 32, width: 200, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14 }} />)}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Today's Revenue",
      value: formatCurrency(stats.todayRevenue),
      icon: DollarSign,
      color: '#2563eb',
      bgColor: '#dbeafe',
      trend: '+12%',
      trendUp: true,
    },
    {
      label: 'Orders Today',
      value: stats.todayOrders,
      icon: ShoppingCart,
      color: '#10b981',
      bgColor: '#d1fae5',
      trend: '+5',
      trendUp: true,
    },
    {
      label: 'Avg Order Value',
      value: formatCurrency(stats.avgOrderValue),
      icon: TrendingUp,
      color: '#8b5cf6',
      bgColor: '#ede9fe',
    },
    {
      label: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: '#f59e0b',
      bgColor: '#fef3c7',
    },
  ];

  return (
    <div style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Welcome back! Here's your store overview.
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
        {statCards.map((card, idx) => (
          <div key={idx} className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--radius-md)',
                background: card.bgColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <card.icon size={22} style={{ color: card.color }} />
              </div>
              {card.trend && (
                <span className={`badge ${card.trendUp ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 11 }}>
                  {card.trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {card.trend}
                </span>
              )}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
              {card.value}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 28 }}>
        {/* Revenue Chart */}
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Revenue (Last 7 Days)</h3>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Daily sales performance</p>
            </div>
            <BarChart3 size={20} style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={stats.last7Days}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={12} fill="#94a3b8" />
              <YAxis axisLine={false} tickLine={false} fontSize={12} fill="#94a3b8" tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  background: 'white', border: '1px solid #e2e8f0', borderRadius: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13,
                }}
                formatter={(value) => [formatCurrency(value), 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Low Stock Alert */}
        <div className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Low Stock Alert</h3>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {stats.lowStockProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-muted)', fontSize: 13 }}>
                All products are well stocked ✓
              </div>
            ) : (
              stats.lowStockProducts.slice(0, 8).map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid var(--color-border)',
                  fontSize: 13,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </div>
                  </div>
                  <span className="badge badge-danger" style={{ fontSize: 11 }}>
                    {p.stock} left
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Recent Sales</h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Latest transactions</p>
          </div>
          <Clock size={18} style={{ color: 'var(--color-text-muted)' }} />
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Date</th>
                <th>Cashier</th>
                <th>Items</th>
                <th>Payment</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentSales.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-muted)' }}>
                    No sales yet. Start selling!
                  </td>
                </tr>
              ) : (
                stats.recentSales.map(sale => (
                  <tr key={sale.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{sale.receiptNumber}</td>
                    <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{formatDateTime(sale.createdAt)}</td>
                    <td style={{ fontSize: 13 }}>{sale.cashierName || 'N/A'}</td>
                    <td style={{ fontSize: 13 }}>{sale.items?.length || 0}</td>
                    <td><span className="badge badge-info" style={{ fontSize: 11, textTransform: 'capitalize' }}>{sale.paymentMethod}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13 }}>{formatCurrency(sale.total)}</td>
                    <td><span className="badge badge-success" style={{ fontSize: 11 }}>Completed</span></td>
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
