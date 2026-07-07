import { formatCurrency, formatDateTime } from '../../utils/helpers';
import { Printer, CheckCircle } from 'lucide-react';

export default function ReceiptModal({ sale, onClose }) {

  const handlePrint = () => {
    // Use an invisible iframe instead of window.open. 
    // Chrome's --kiosk-printing often fails on popup windows, but works perfectly on iframes!
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
        <title>Receipt - ${sale.receiptNumber}</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; width: 100%; max-width: 280px; padding: 10px; margin: 0 auto; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .big { font-size: 16px; }
          h1 { font-size: 18px; margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <div class="center">
          <h1 class="bold">BuildPOS Hardware</h1>
          <p>Construction Materials & Supplies</p>
          <p style="margin-top:4px; font-size:10px;">Receipt: ${sale.receiptNumber}</p>
          <p style="font-size:10px;">${formatDateTime(sale.createdAt)}</p>
          <p style="font-size:10px;">Cashier: ${sale.cashierName || 'N/A'}</p>
          ${sale.customerName ? `<p style="font-size:10px;">Customer: ${sale.customerName}</p>` : ''}
        </div>
        <div class="line"></div>
        ${sale.items.map(item => `
          <div style="margin: 4px 0;">
            <div>${item.productName}</div>
            <div class="row">
              <span>${item.qty} x ${formatCurrency(item.price)}</span>
              <span class="bold">${formatCurrency(item.subtotal)}</span>
            </div>
          </div>
        `).join('')}
        <div class="line"></div>
        <div class="row"><span>Subtotal</span><span>${formatCurrency(sale.subtotal)}</span></div>
        <div class="row"><span>Tax (0%)</span><span>${formatCurrency(sale.taxAmount)}</span></div>
        <div class="line"></div>
        <div class="row big bold"><span>TOTAL</span><span>${formatCurrency(sale.total)}</span></div>
        <div class="line"></div>
        <div class="row"><span>Payment</span><span>${sale.paymentMethod.toUpperCase()}</span></div>
        <div class="row"><span>Paid</span><span>${formatCurrency(sale.amountPaid)}</span></div>
        ${sale.balanceDue > 0 
          ? `<div class="row bold"><span>Balance Due</span><span>${formatCurrency(sale.balanceDue)}</span></div>`
          : `<div class="row bold"><span>Change</span><span>${formatCurrency(sale.change)}</span></div>`
        }
        <div class="line"></div>
        <div class="center" style="margin-top:12px;">
          <p class="bold">Thank you for your purchase!</p>
          <p style="font-size:10px; margin-top:4px;">Powered by BuildPOS</p>
        </div>
      </body>
      </html>
    `);
    doc.close();

    // Slight delay to ensure styles are applied before printing
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      
      // Remove iframe after print
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal animate-scale-in"
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 420, padding: 0 }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 24px 0',
          textAlign: 'center',
        }}>
          <div className="animate-scale-in" style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--color-success-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <CheckCircle size={32} style={{ color: 'var(--color-success)' }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Sale Complete!</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{sale.receiptNumber}</p>
          {sale.customerName && (
            <p style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>Customer: {sale.customerName}</p>
          )}
        </div>

        {/* Receipt Preview */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{
            background: 'var(--color-bg-primary)',
            borderRadius: 'var(--radius-lg)',
            padding: 20,
            border: '1px solid var(--color-border)',
          }}>
            {/* Items */}
            {sale.items.map((item, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                marginBottom: 8,
                paddingBottom: 8,
                borderBottom: idx < sale.items.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{item.productName}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {item.qty} × {formatCurrency(item.price)}
                  </div>
                </div>
                <div style={{ fontWeight: 600 }}>{formatCurrency(item.subtotal)}</div>
              </div>
            ))}

            {/* Totals */}
            <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: 12, marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 800 }}>
                <span>Total</span>
                <span style={{ color: 'var(--color-accent)' }}>{formatCurrency(sale.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 8, marginBottom: 4 }}>
                <span>Paid ({sale.paymentMethod})</span>
                <span>{formatCurrency(sale.amountPaid)}</span>
              </div>
              {sale.balanceDue > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: 'var(--color-accent)', marginTop: 4 }}>
                  <span>Balance Due</span>
                  <span>{formatCurrency(sale.balanceDue)}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: 'var(--color-success)', marginTop: 4 }}>
                  <span>Change</span>
                  <span>{formatCurrency(sale.change)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={handlePrint} className="btn btn-secondary" style={{ flex: 1 }}>
              <Printer size={16} /> Print Receipt
            </button>
            <button onClick={onClose} className="btn btn-primary" style={{ flex: 1 }}>
              New Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
