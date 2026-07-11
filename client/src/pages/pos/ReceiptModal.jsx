import { useEffect } from 'react';
import { formatCurrency, formatDateTime } from '../../utils/helpers';

export default function ReceiptModal({ sale, onClose }) {

  useEffect(() => {
    if (!sale) return;

    const handlePrint = () => {
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

      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          onClose(); // Automatically close immediately after sending to print spooler
        }, 500);
      }, 250);
    };

    handlePrint();
  }, [sale, onClose]);

  return null; // Headless component, renders no UI
}
