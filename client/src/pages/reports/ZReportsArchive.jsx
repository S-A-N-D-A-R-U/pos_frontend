import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../../db/database';
import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { FileText, Printer } from 'lucide-react';

export default function ZReportsArchive() {
  const zReports = useLiveQuery(() => db.zReports.orderBy('closedAt').reverse().toArray(), []);

  const handlePrintA4 = (report) => {
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
        <title>Z-Report - ${formatDateTime(report.closedAt)}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
            color: #333; 
            line-height: 1.6;
          }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #ddd; padding-bottom: 20px; }
          h1 { font-size: 28px; margin-bottom: 5px; color: #111; }
          h2 { font-size: 18px; color: #555; font-weight: 500; }
          .meta-info { display: flex; justify-content: space-between; margin-bottom: 40px; font-size: 14px; }
          .meta-info div { flex: 1; }
          
          .section { margin-bottom: 30px; }
          .section-title { font-size: 16px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 15px; color: #444; text-transform: uppercase; letter-spacing: 1px; }
          
          .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 15px; }
          .row.bold { font-weight: bold; font-size: 16px; }
          .row.highlight { background: #f9f9f9; padding: 12px 10px; border-radius: 4px; margin-top: 10px; }
          
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          
          .variance { color: ${report.variance < 0 ? '#ef4444' : (report.variance > 0 ? '#10b981' : '#333')}; }
          
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>BuildPOS</h1>
          <h2>End of Shift Z-Report (Detailed A4)</h2>
        </div>
        
        <div class="meta-info">
          <div>
            <strong>Cashier:</strong> ${report.cashierName || 'Unknown'}<br>
            <strong>Status:</strong> Shift Closed
          </div>
          <div style="text-align: right;">
            <strong>Closed At:</strong> ${formatDateTime(report.closedAt)}<br>
            <strong>Report ID:</strong> ${report.id.substring(0, 8).toUpperCase()}
          </div>
        </div>

        <div class="grid">
          <div>
            <div class="section">
              <div class="section-title">Sales Summary</div>
              <div class="row"><span>Total Orders</span><span>${report.saleCount || 0}</span></div>
              <div class="row"><span>Gross Sales</span><span>${formatCurrency(report.totalSales)}</span></div>
              <div class="row" style="color: #666;"><span>Discounts Given</span><span>-${formatCurrency(report.totalDiscount || 0)}</span></div>
              <div class="row bold highlight"><span>Net Sales</span><span>${formatCurrency(report.totalSales - (report.totalDiscount || 0))}</span></div>
            </div>
            
            <div class="section">
              <div class="section-title">Payment Breakdown</div>
              <div class="row"><span>Cash Sales</span><span>${formatCurrency(report.cashSales)}</span></div>
              <div class="row"><span>Card/Other Sales</span><span>${formatCurrency(report.cardSales)}</span></div>
            </div>
          </div>
          
          <div>
            <div class="section">
              <div class="section-title">Cash Drawer Reconciliation</div>
              <div class="row"><span>Starting Float</span><span>Rs. 0.00</span></div>
              <div class="row"><span>Cash Received</span><span>+${formatCurrency(report.cashSales)}</span></div>
              <div class="row"><span>Cash Refunds</span><span>Rs. 0.00</span></div>
              <div class="row bold" style="margin-top: 10px; border-top: 1px dashed #ddd; padding-top: 10px;">
                <span>Expected Cash in Drawer</span><span>${formatCurrency(report.expectedCash)}</span>
              </div>
              <div class="row">
                <span>Actual Cash Counted</span><span>${formatCurrency(report.actualCash)}</span>
              </div>
              <div class="row bold highlight variance">
                <span>Variance (Over/Short)</span>
                <span>${report.variance === 0 ? 'Balanced' : (report.variance > 0 ? `+${formatCurrency(report.variance)}` : formatCurrency(report.variance))}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          Generated by BuildPOS System &bull; Save as PDF to retain digital records
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
      }, 500);
    }, 250);
  };

  if (!zReports) {
    return (
      <div style={{ padding: 20 }}>
        <div className="skeleton" style={{ height: 400, borderRadius: 14 }} />
      </div>
    );
  }

  if (zReports.length === 0) {
    return (
      <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <FileText size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
        <div style={{ fontSize: 16, fontWeight: 600 }}>No Z-Reports found</div>
        <div style={{ fontSize: 14 }}>Close a shift from the POS screen to generate a Z-Report.</div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
            <th style={{ padding: '16px 20px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Date & Time</th>
            <th style={{ padding: '16px 20px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Cashier</th>
            <th style={{ padding: '16px 20px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Gross Sales</th>
            <th style={{ padding: '16px 20px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Variance</th>
            <th style={{ padding: '16px 20px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {zReports.map((report) => (
            <tr key={report.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 500 }}>
                {formatDateTime(report.closedAt)}
              </td>
              <td style={{ padding: '16px 20px', fontSize: 14 }}>
                {report.cashierName || 'Unknown'}
              </td>
              <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {formatCurrency(report.totalSales)}
              </td>
              <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 600, color: report.variance < 0 ? 'var(--color-danger)' : (report.variance > 0 ? 'var(--color-success)' : 'var(--color-text-muted)') }}>
                {report.variance === 0 ? 'Balanced' : (report.variance > 0 ? `+${formatCurrency(report.variance)}` : formatCurrency(report.variance))}
              </td>
              <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => handlePrintA4(report)}
                  style={{ gap: 6 }}
                >
                  <Printer size={14} /> PDF / Print (A4)
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
