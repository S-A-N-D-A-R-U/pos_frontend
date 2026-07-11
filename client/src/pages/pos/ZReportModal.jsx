import { useState, useEffect, useMemo } from 'react';
import { X, Printer, CheckCircle, FileText } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import db from '../../db/database';
import { useAuth } from '../../contexts/AuthContext';
import { useSync } from '../../contexts/SyncContext';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { useToast } from '../../contexts/ToastContext';

export default function ZReportModal({ onClose }) {
  const { user } = useAuth();
  const { pushToOutbox } = useSync();
  const toast = useToast();

  const [sales, setSales] = useState([]);
  const [lastZReport, setLastZReport] = useState(null);
  const [actualCashInput, setActualCashInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Find the most recent Z-Report for this cashier
        const reports = await db.zReports
          .where('cashierId')
          .equals(user?.id || 'unknown')
          .reverse()
          .sortBy('closedAt');

        const lastReport = reports.length > 0 ? reports[0] : null;
        setLastZReport(lastReport);

        // Fetch sales since last report
        let allSales = await db.sales
          .where('cashierId')
          .equals(user?.id || 'unknown')
          .toArray();

        if (lastReport) {
          const lastTime = new Date(lastReport.closedAt).getTime();
          allSales = allSales.filter(s => new Date(s.createdAt).getTime() > lastTime);
        }

        setSales(allSales.filter(s => s.status === 'completed'));
      } catch (err) {
        console.error(err);
        toast.error('Failed to load shift data');
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchData();
    }
  }, [user, toast]);

  const stats = useMemo(() => {
    let totalSales = 0;
    let cashSales = 0;
    let cardSales = 0;
    let totalDiscount = 0;

    sales.forEach(s => {
      totalSales += s.total;
      if (s.paymentMethod === 'cash') cashSales += s.total;
      if (s.paymentMethod === 'card') cardSales += s.total;

      // Global discount
      if (s.discountAmount) totalDiscount += s.discountAmount;

      // Item discounts
      if (s.items) {
        s.items.forEach(item => {
          if (item.discountValue > 0) {
            const itemTotal = item.price * item.qty;
            const disc = item.discountType === 'percentage'
              ? itemTotal * (item.discountValue / 100)
              : item.discountValue;
            totalDiscount += disc;
          }
        });
      }
    });

    return { totalSales, cashSales, cardSales, totalDiscount, count: sales.length };
  }, [sales]);

  const expectedCash = stats.cashSales;
  const actualCash = parseFloat(actualCashInput) || 0;
  const variance = actualCash - expectedCash;

  const handlePrint = async (type = 'X') => {
    const isZReport = type === 'Z';
    const reportId = uuidv4();
    const now = new Date().toISOString();

    if (isZReport) {
      const report = {
        id: reportId,
        cashierId: user?.id,
        cashierName: user?.name,
        closedAt: now,
        expectedCash,
        actualCash,
        variance,
        totalSales: stats.totalSales,
        cashSales: stats.cashSales,
        cardSales: stats.cardSales,
        totalDiscount: stats.totalDiscount,
        saleCount: stats.count,
        syncStatus: 'pending'
      };
      await db.zReports.put(report);
      await pushToOutbox('zReport', reportId, 'create', report);
    }

    // Print Logic
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${isZReport ? 'Z-Report' : 'X-Report'}</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            font-size: 13px;
            width: 100%; 
            max-width: 280px; 
            padding: 10px; 
            margin: 0 auto; 
            color: #000;
            background: #fff;
            line-height: 1.2;
            -webkit-text-stroke: 0.25px #000;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .big { font-size: 16px; }
          h1 { font-size: 18px; margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <div class="center">
          <h1 class="bold">BuildPOS</h1>
          <h2 style="font-size: 14px;">${isZReport ? 'Z-REPORT (END OF SHIFT)' : 'X-REPORT (MID SHIFT)'}</h2>
          <p style="margin-top:4px; font-size:10px;">Printed: ${formatDateTime(now)}</p>
          <p style="font-size:10px;">Cashier: ${user?.name || 'N/A'}</p>
          ${lastZReport ? `<p style="font-size:10px;">Since: ${formatDateTime(lastZReport.closedAt)}</p>` : ''}
        </div>
        <div class="line"></div>
        <div class="row"><span>Total Orders</span><span>${stats.count}</span></div>
        <div class="row big bold" style="margin-top: 6px;"><span>GROSS SALES</span><span>${formatCurrency(stats.totalSales)}</span></div>
        <div class="line"></div>
        <div class="row"><span>Cash Sales</span><span>${formatCurrency(stats.cashSales)}</span></div>
        <div class="row"><span>Card Sales</span><span>${formatCurrency(stats.cardSales)}</span></div>
        <div class="row" style="margin-top: 6px; color: #555;"><span>Discounts Given</span><span>-${formatCurrency(stats.totalDiscount)}</span></div>
        
        ${isZReport ? `
        <div class="line"></div>
        <div class="row bold"><span>Expected Cash</span><span>${formatCurrency(expectedCash)}</span></div>
        <div class="row"><span>Actual Cash</span><span>${formatCurrency(actualCash)}</span></div>
        <div class="row bold" style="margin-top: 6px;">
          <span>Variance</span>
          <span>${variance === 0 ? '0.00' : (variance > 0 ? '+' : '') + formatCurrency(variance)}</span>
        </div>
        ` : ''}
        
        <div class="line"></div>
        <div class="center" style="margin-top:12px;">
          <p class="bold">${isZReport ? 'SHIFT CLOSED' : 'REPORT ONLY - SHIFT OPEN'}</p>
        </div>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        if (isZReport) {
          toast.success('Shift closed successfully');
          onClose();
        }
      }, 500);
    }, 250);
  };

  if (loading) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
    }}>
      <div
        className="card animate-scale-up"
        style={{ width: '100%', maxWidth: 500, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
      >
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--color-bg-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>End of Shift (Z-Report)</h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div style={{ padding: 20, overflow: 'auto' }}>
          <div style={{ background: 'var(--color-bg-secondary)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Shift Started</div>
            <div style={{ fontWeight: 600 }}>{lastZReport ? formatDateTime(lastZReport.closedAt) : 'Beginning of Time'}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="card" style={{ padding: 16, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Total Sales</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-accent)' }}>{formatCurrency(stats.totalSales)}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{stats.count} Orders</div>
            </div>
            <div className="card" style={{ padding: 16, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Cash Sales</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-success)' }}>{formatCurrency(stats.cashSales)}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>Card: {formatCurrency(stats.cardSales)}</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Blind Cash Count</h4>
            <div style={{ background: 'var(--color-bg-secondary)', padding: 16, borderRadius: 'var(--radius-md)' }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Actual Cash in Drawer
              </label>
              <input
                type="number"
                step="any"
                min="0"
                className="input"
                style={{ width: '100%', fontSize: 24, textAlign: 'center', padding: 12, marginBottom: 12 }}
                value={actualCashInput}
                onChange={e => setActualCashInput(e.target.value)}
                placeholder="0.00"
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Expected Cash:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(expectedCash)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Variance:</span>
                <span style={{
                  fontWeight: 700,
                  color: variance === 0 ? 'var(--color-success)' : 'var(--color-danger)'
                }}>
                  {variance === 0 ? 'Balanced' : (variance > 0 ? `+${formatCurrency(variance)} (Over)` : `${formatCurrency(variance)} (Short)`)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          padding: '16px 20px', borderTop: '1px solid var(--color-border)',
          display: 'flex', gap: 12, background: 'var(--color-bg-secondary)'
        }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={() => handlePrint('X')}
          >
            <Printer size={16} /> Print X-Report (Preview)
          </button>
          <button
            className="btn btn-danger"
            style={{ flex: 1 }}
            onClick={() => handlePrint('Z')}
            disabled={actualCashInput === ''}
          >
            <CheckCircle size={16} /> Close Shift (Z-Report)
          </button>
        </div>
      </div>
    </div>
  );
}
